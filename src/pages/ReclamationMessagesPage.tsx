import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { MessageSquare, Reply, CheckCircle, Loader, Eye, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ReclamationMessage {
  id: string;
  receive_command_id: string;
  message: string;
  status: string;
  created_at: string;
  created_by: string | null;
  creator_email?: string | null;
  reclamation_products?: Array<{
    id: string;
    product_name: string;
    quantity: number;
  }>;
  reclamation_responses?: Array<{
    id: string;
    response_message: string;
    responded_by?: string | null;
    created_at: string;
  }>;
}

const StatCard = ({ icon: Icon, label, value, gradient, delay }: { icon: React.ElementType; label: string; value: string | number; gradient: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="erp-stat-card"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${gradient}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </motion.div>
);

export default function ReclamationMessagesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRtl = i18n.language === 'ar';

  const [messages, setMessages] = useState<ReclamationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [selectedMsg, setSelectedMsg] = useState<ReclamationMessage | null>(null);
  const [message, setMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('all');
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    fetchReclamations();
  }, []);

  const fetchReclamations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reclamations')
        .select(`
          id,
          receive_command_id,
          message,
          status,
          created_at,
          created_by,
          reclamation_products (
            id,
            product_name,
            quantity
          ),
          reclamation_responses (
            id,
            response_message,
            responded_by,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user names from users table
      if (data && data.length > 0) {
        const creatorIds = Array.from(new Set(data.map(r => r.created_by).filter(Boolean)));
        const responderIds = Array.from(new Set(
          data.flatMap(r => r.reclamation_responses?.map(resp => resp.responded_by)).filter(Boolean)
        ));
        
        const allUserIds = [...new Set([...creatorIds, ...responderIds])];
        const nameMap = new Map<string, string>();
        
        if (allUserIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', allUserIds);
          
          if (usersData) {
            usersData.forEach(user => {
              nameMap.set(user.id, user.full_name || user.id.substring(0, 8));
            });
          }
        }
        
        setUserNames(nameMap);
        const enrichedData = data.map(msg => ({
          ...msg,
          creator_email: msg.created_by ? nameMap.get(msg.created_by) || msg.created_by.substring(0, 8) : null
        }));
        
        setMessages(enrichedData as ReclamationMessage[] || []);
      } else {
        setMessages([]);
      }
    } catch (err: any) {
      setMessage(`Error loading reclamations: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyingId || !replyText.trim()) {
      setMessage('Please enter a response');
      return;
    }

    try {
      const { error } = await supabase
        .from('reclamation_responses')
        .insert({
          reclamation_id: replyingId,
          response_message: replyText,
          responded_by: user?.id
        });

      if (error) throw error;

      // Update reclamation status to resolved
      const { error: updateError } = await supabase
        .from('reclamations')
        .update({ status: 'resolved' })
        .eq('id', replyingId);

      if (updateError) throw updateError;

      setMessage('Response sent successfully!');
      setReplyingId(null);
      setReplyText('');
      setSelectedMsg(null);
      await fetchReclamations();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const unreplied = messages.filter(m => m.status !== 'resolved');
  const replied = messages.filter(m => m.status === 'resolved');

  // Filter messages based on selected status
  const filteredMessages = filterStatus === 'all' 
    ? messages 
    : filterStatus === 'pending'
    ? unreplied
    : replied;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRtl ? 'rtl' : 'ltr'}`}>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${
            message.includes('Error')
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {message}
        </motion.div>
      )}

      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-3xl font-bold text-foreground mb-2"
      >
        {t('nav.reclamation_messages')}
      </motion.h1>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
            filterStatus === 'all'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <Filter className="w-4 h-4" />
          {t('common.all')} ({messages.length})
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
            filterStatus === 'pending'
              ? 'bg-amber-500 text-white shadow-md'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          {t('common.pending')} ({unreplied.length})
        </button>
        <button
          onClick={() => setFilterStatus('resolved')}
          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
            filterStatus === 'resolved'
              ? 'bg-green-600 text-white shadow-md'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          {t('common.resolved')} ({replied.length})
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        <StatCard icon={MessageSquare} label={t('common.pending_reclamations')} value={filterStatus === 'all' ? unreplied.length : filteredMessages.filter(m => m.status !== 'resolved').length} gradient="btn-gradient-warm" delay={0.1} />
        <StatCard icon={CheckCircle} label={t('common.resolved_reclamations')} value={filterStatus === 'all' ? replied.length : filteredMessages.filter(m => m.status === 'resolved').length} gradient="btn-gradient-success" delay={0.15} />
      </div>

      {filteredMessages.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="erp-card text-center py-12 text-muted-foreground">
          {t('common.no_data')}
        </motion.div>
      ) : (
        <>
          {/* Unreplied Messages */}
          {filterStatus !== 'resolved' && unreplied.filter(m => filterStatus === 'all' || filterStatus === 'pending').length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold text-amber-700 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                {t('common.pending_reclamations')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unreplied.filter(m => filterStatus === 'all' || filterStatus === 'pending').map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    className="erp-card border-l-4 border-l-amber-500 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-foreground">{msg.receive_command_id}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(msg.created_at).toLocaleDateString()}
                          {msg.creator_email && <span className="block mt-1">By: {msg.creator_email}</span>}
                        </p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700">{t('common.pending')}</Badge>
                    </div>
                    <p className="text-sm text-foreground mb-2 line-clamp-2">{msg.message}</p>
                    
                    {/* Products List */}
                    {msg.reclamation_products && msg.reclamation_products.length > 0 && (
                      <div className="mb-3 p-2 bg-secondary/50 rounded">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">{t('common.products')}</p>
                        {msg.reclamation_products.map((prod) => (
                          <p key={prod.id} className="text-xs text-foreground">
                            • {prod.product_name} (Qty: {prod.quantity})
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => setSelectedMsg(msg)}
                        className="gap-1 flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-2 h-8 text-xs"
                      >
                        <Eye className="w-3 h-3" /> {t('common.view')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => { setReplyingId(msg.id); setSelectedMsg(msg); }}
                        className="gap-1 flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-2 h-8 text-xs"
                      >
                        <Reply className="w-3 h-3" /> {t('common.reply')}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Resolved Messages */}
          {filterStatus !== 'pending' && replied.filter(m => filterStatus === 'all' || filterStatus === 'resolved').length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold text-emerald-700 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {t('common.resolved_reclamations')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {replied.filter(m => filterStatus === 'all' || filterStatus === 'resolved').map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="erp-card border-l-4 border-l-emerald-500 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-foreground">{msg.receive_command_id}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(msg.created_at).toLocaleDateString()}
                          {msg.creator_email && <span className="block mt-1">By: {msg.creator_email}</span>}
                        </p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700">{t('common.resolved')}</Badge>
                    </div>
                    <p className="text-sm text-foreground mb-3 line-clamp-2">{msg.message}</p>

                    {/* Products List */}
                    {msg.reclamation_products && msg.reclamation_products.length > 0 && (
                      <div className="mb-3 p-2 bg-secondary/50 rounded">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">{t('common.products')}</p>
                        {msg.reclamation_products.map((prod) => (
                          <p key={prod.id} className="text-xs text-foreground">
                            • {prod.product_name} (Qty: {prod.quantity})
                          </p>
                        ))}
                      </div>
                    )}

                    {msg.reclamation_responses && msg.reclamation_responses[0] && (
                      <div className="bg-emerald-50 rounded-lg p-3 mb-4 border border-emerald-200">
                        <p className="text-xs text-emerald-700 font-semibold mb-1 flex items-center justify-between">
                          <span>{t('common.response')}</span>
                          <code className="text-emerald-600 bg-white px-2 py-1 rounded text-[10px] font-mono">#{msg.reclamation_responses[0].id.substring(0, 8)}</code>
                        </p>
                        <p className="text-sm text-emerald-900 mb-2">{msg.reclamation_responses[0].response_message}</p>
                        <div className="text-xs text-emerald-600 space-y-1">
                          <p>{new Date(msg.reclamation_responses[0].created_at).toLocaleDateString()}</p>
                          {msg.reclamation_responses[0].responded_by && (
                            <p>By: {userNames.get(msg.reclamation_responses[0].responded_by) || msg.reclamation_responses[0].responded_by.substring(0, 8)}</p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedMsg(msg)}
                      className="w-full"
                    >
                      {t('common.view_details')}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Details Dialog */}
      <Dialog open={!!selectedMsg && !replyingId} onOpenChange={() => setSelectedMsg(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedMsg?.receive_command_id}</span>
              <Badge className={selectedMsg?.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                {selectedMsg?.status === 'resolved' ? t('common.resolved') : t('common.pending')}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {selectedMsg && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-xs text-muted-foreground font-semibold mb-2">{t('common.message')}</p>
                <p className="text-sm text-foreground">{selectedMsg.message}</p>
              </div>

              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-xs text-muted-foreground font-semibold mb-2">{t('common.date')}</p>
                <p className="text-sm text-foreground">{new Date(selectedMsg.created_at).toLocaleDateString()}</p>
              </div>

              {/* Products */}
              {selectedMsg.reclamation_products && selectedMsg.reclamation_products.length > 0 && (
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground font-semibold mb-3">{t('common.products')}</p>
                  <div className="space-y-2">
                    {selectedMsg.reclamation_products.map((prod) => (
                      <Card key={prod.id} className="p-2">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-medium text-foreground">{prod.product_name}</p>
                          <Badge variant="outline">{t('common.quantity')}: {prod.quantity}</Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Response */}
              {selectedMsg.reclamation_responses && selectedMsg.reclamation_responses[0] && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-xs text-emerald-700 font-semibold mb-2 flex items-center justify-between">
                    <span>{t('common.response')}</span>
                    <code className="text-emerald-600 bg-white px-2 py-1 rounded text-[10px] font-mono">#{selectedMsg.reclamation_responses[0].id.substring(0, 8)}</code>
                  </p>
                  <p className="text-sm text-emerald-900 mb-2">{selectedMsg.reclamation_responses[0].response_message}</p>
                  <div className="text-xs text-emerald-600 space-y-1">
                    <p>{new Date(selectedMsg.reclamation_responses[0].created_at).toLocaleDateString()}</p>
                    {selectedMsg.reclamation_responses[0].responded_by && (
                      <p>By: {userNames.get(selectedMsg.reclamation_responses[0].responded_by) || selectedMsg.reclamation_responses[0].responded_by.substring(0, 8)}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMsg(null)}>
              {t('common.cancel')}
            </Button>
            {selectedMsg && selectedMsg.status !== 'resolved' && (
              <Button onClick={() => setReplyingId(selectedMsg.id)} className="gap-1 bg-amber-600 hover:bg-amber-700 text-white">
                <Reply className="w-3.5 h-3.5" />
                {t('common.reply')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={!!replyingId} onOpenChange={() => { setReplyingId(null); setReplyText(''); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('common.reply')} - {selectedMsg?.receive_command_id}</DialogTitle>
          </DialogHeader>
          {selectedMsg && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary/50 rounded-lg border border-amber-200">
                <p className="text-xs text-muted-foreground font-semibold mb-2">{t('common.original_message')}</p>
                <p className="text-sm text-foreground">{selectedMsg.message}</p>
                <p className="text-xs text-muted-foreground mt-2">{new Date(selectedMsg.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block font-semibold">{t('common.response')}</label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={t('common.enter_response') || 'Enter your response...'}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReplyingId(null); setReplyText(''); }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleReply} className="gap-1 bg-amber-600 hover:bg-amber-700 text-white">
              <MessageSquare className="w-3.5 h-3.5" />
              {t('common.send_response') || t('common.reply')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
