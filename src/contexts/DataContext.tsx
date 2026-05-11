import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

export interface Product {
  id: string;
  name: string;
  category: string;
  unity: string;
  quantity: number;
  price: number;
  supplier?: string;
  note?: string;
}

export interface Command {
  id: string;
  products: Product[];
  status: 'pending' | 'validated' | 'purchase' | 'bon_commande' | 'payment' | 'finalized';
  createdBy: string;
  createdAt: string;
  note?: string;
}

export interface Expense {
  id: string;
  description: string;
  price: number;
  date: string;
  projectId?: string;
}

export interface ProjectBox {
  id: string;
  name: string;
  address: string;
  chefId: string;
  description: string;
  totalAmount: number;
  date: string;
  versements: { id: string; amount: number; date: string; description: string }[];
}

export interface Worker {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: string;
}

export interface WorkerExpense {
  id: string;
  description: string;
  totalCost: number;
  date: string;
}

export interface EnterpriseExpense {
  id: string;
  name: string;
  description: string;
  cost: number;
  date: string;
}

export interface Debt {
  id: string;
  supplierId: string;
  supplierName: string;
  totalAmount: number;
  paidAmount: number;
  date: string;
}

export interface Appointment {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
}

export interface EnterpriseSettings {
  name: string;
  logoUrl: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  nis?: string;
  nif?: string;
  rc?: string;
  article?: string;
}

export interface Offer {
  id: string;
  supplier: string;
  description: string;
  imageUrl?: string;
}

export interface BonCommande {
  id: string;
  commandId: string;
  products: Product[];
  status: 'pending' | 'validated' | 'paid';
  createdAt: string;
  offers: Offer[];
  totalAmount: number;
}

export interface PaymentCommand {
  id: string;
  bonCommandeId: string;
  totalPrice: number;
  note?: string;
  status: 'pending' | 'validated';
  createdAt: string;
}

interface DataContextType {
  commands: Command[];
  products: Product[];
  expenses: Expense[];
  projectBoxes: ProjectBox[];
  categories: string[];
  unities: string[];
  suppliers: string[];
  workers: Worker[];
  workerExpenses: WorkerExpense[];
  enterpriseExpenses: EnterpriseExpense[];
  debts: Debt[];
  appointments: Appointment[];
  bonsCommandes: BonCommande[];
  paymentCommands: PaymentCommand[];
  enterpriseSettings: EnterpriseSettings;
  updateEnterpriseSettings: (settings: Partial<EnterpriseSettings>) => void;
  loadEnterpriseSettings: (createdById: string) => Promise<void>;
  setCommands: (commands: Command[]) => void;
  setProducts: (products: Product[]) => void;
  setExpenses: (expenses: Expense[]) => void;
  setProjectBoxes: (boxes: ProjectBox[]) => void;
  setCategories: (categories: string[]) => void;
  setUnities: (unities: string[]) => void;
  setSuppliers: (suppliers: string[]) => void;
  setWorkers: (workers: Worker[]) => void;
  setWorkerExpenses: (expenses: WorkerExpense[]) => void;
  setEnterpriseExpenses: (expenses: EnterpriseExpense[]) => void;
  setDebts: (debts: Debt[]) => void;
  setAppointments: (appointments: Appointment[]) => void;
  setBonsCommandes: (bons: BonCommande[]) => void;
  setPaymentCommands: (commands: PaymentCommand[]) => void;
  addCommand: (cmd: Command) => void;
  updateCommand: (id: string, data: Partial<Command>) => void;
  deleteCommand: (id: string) => void;
  addProduct: (p: Product) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addExpense: (e: Expense) => void;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addCategory: (c: string) => void;
  addUnity: (u: string) => void;
  addSupplier: (s: string) => void;
  addProjectBox: (p: ProjectBox) => void;
  updateProjectBox: (id: string, data: Partial<ProjectBox>) => void;
  deleteProjectBox: (id: string) => void;
  addWorker: (w: Worker) => void;
  updateWorker: (id: string, data: Partial<Worker>) => void;
  deleteWorker: (id: string) => void;
  addWorkerExpense: (e: WorkerExpense) => void;
  updateWorkerExpense: (id: string, data: Partial<WorkerExpense>) => void;
  deleteWorkerExpense: (id: string) => void;
  addEnterpriseExpense: (e: EnterpriseExpense) => void;
  updateEnterpriseExpense: (id: string, data: Partial<EnterpriseExpense>) => void;
  deleteEnterpriseExpense: (id: string) => void;
  addDebt: (d: Debt) => void;
  updateDebt: (id: string, data: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  addAppointment: (a: Appointment) => void;
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  addBonCommande: (b: BonCommande) => void;
  updateBonCommande: (id: string, data: Partial<BonCommande>) => void;
  deleteBonCommande: (id: string) => void;
  addPaymentCommand: (p: PaymentCommand) => void;
  updatePaymentCommand: (id: string, data: Partial<PaymentCommand>) => void;
  deletePaymentCommand: (id: string) => void;
}

const DataContext = createContext<DataContextType | null>(null);

const initialCategories = ['إسمنت', 'حديد', 'خشب', 'رمل', 'كهرباء'];
const initialUnities = ['كغ', 'طن', 'متر', 'قطعة', 'لتر'];
const initialSuppliers = ['مورد 1', 'مورد 2', 'مورد 3'];

const initialProducts: Product[] = [
  { id: '1', name: 'إسمنت بورتلاندي', category: 'إسمنت', unity: 'طن', quantity: 50, price: 12000 },
  { id: '2', name: 'حديد تسليح', category: 'حديد', unity: 'طن', quantity: 30, price: 85000 },
  { id: '3', name: 'خشب صنوبر', category: 'خشب', unity: 'متر', quantity: 200, price: 3500 },
];

const initialCommands: Command[] = [
  { id: 'CMD-001', products: [initialProducts[0], initialProducts[1]], status: 'pending', createdBy: 'خالد عبدالله', createdAt: '2026-03-20', note: 'أمر عاجل' },
  { id: 'CMD-002', products: [initialProducts[2]], status: 'validated', createdBy: 'خالد عبدالله', createdAt: '2026-03-18' },
  { id: 'CMD-003', products: [initialProducts[0]], status: 'purchase', createdBy: 'خالد عبدالله', createdAt: '2026-03-15' },
  { id: 'CMD-004', products: [initialProducts[1], initialProducts[2]], status: 'finalized', createdBy: 'خالد عبدالله', createdAt: '2026-03-28' },
  { id: 'CMD-005', products: [initialProducts[0]], status: 'finalized', createdBy: 'خالد عبدالله', createdAt: '2026-03-27' },
];

const initialExpenses: Expense[] = [
  { id: '1', description: 'نقل مواد', price: 25000, date: '2026-03-20', projectId: '1' },
  { id: '2', description: 'أجرة عمال', price: 45000, date: '2026-03-19', projectId: '1' },
];

const initialProjectBoxes: ProjectBox[] = [
  { id: '1', name: 'مشروع البناء A', address: 'شارع الأمير', chefId: '2', description: 'مشروع بناء سكني', totalAmount: 5000000, date: '2026-01-01', versements: [{ id: 'v1', amount: 1000000, date: '2026-01-15', description: 'دفعة أولى' }] },
];

const initialWorkers: Worker[] = [
  { id: 'w1', fullName: 'علي حسين', username: 'ali', email: 'ali@erp.com', role: 'عامل بناء' },
  { id: 'w2', fullName: 'محمد سعد', username: 'mohamad', email: 'mohamad@erp.com', role: 'كهربائي' },
];

const initialWorkerExpenses: WorkerExpense[] = [
  { id: 'we1', description: 'أجور أسبوعية', totalCost: 150000, date: '2026-03-20' },
];

const initialEnterpriseExpenses: EnterpriseExpense[] = [
  { id: 'ee1', name: 'كراء المكتب', description: 'إيجار شهري', cost: 50000, date: '2026-03-01' },
];

const initialDebts: Debt[] = [
  { id: 'd1', supplierId: '1', supplierName: 'مورد 1', totalAmount: 500000, paidAmount: 200000, date: '2026-02-15' },
  { id: 'd2', supplierId: '2', supplierName: 'مورد 2', totalAmount: 300000, paidAmount: 300000, date: '2026-01-10' },
];

const initialAppointments: Appointment[] = [
  { id: 'a1', title: 'اجتماع مع المورد', description: 'مناقشة الأسعار الجديدة', date: '2026-03-28', time: '10:00' },
];

const initialBonsCommandes: BonCommande[] = [
  {
    id: 'BC-001', commandId: 'CMD-003', products: [initialProducts[0]], status: 'pending',
    createdAt: '2026-03-16', offers: [
      { id: 'o1', supplier: 'مورد 1', description: 'عرض بسعر مخفض مع توصيل مجاني' }
    ], totalAmount: 600000
  },
  {
    id: 'BC-002', commandId: 'CMD-001', products: [initialProducts[0], initialProducts[1]], status: 'validated',
    createdAt: '2026-03-21', offers: [], totalAmount: 2650000
  },
];

const initialPaymentCommands: PaymentCommand[] = [
  { id: 'PAY-001', bonCommandeId: 'BC-002', totalPrice: 2650000, note: 'دفع كامل', status: 'pending', createdAt: '2026-03-22' },
];

const initialEnterpriseSettings: EnterpriseSettings = {
  name: 'ERP System',
  logoUrl: '',
  address: '',
  phone: '',
  email: '',
  description: '',
  nis: '',
  nif: '',
  rc: '',
  article: ''
};

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [commands, setCommands] = useState<Command[]>(initialCommands);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [projectBoxes, setProjectBoxes] = useState<ProjectBox[]>(initialProjectBoxes);
  const [categories, setCategories] = useState(initialCategories);
  const [unities, setUnities] = useState(initialUnities);
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [workers, setWorkers] = useState<Worker[]>(initialWorkers);
  const [workerExpenses, setWorkerExpenses] = useState<WorkerExpense[]>(initialWorkerExpenses);
  const [enterpriseExpenses, setEnterpriseExpenses] = useState<EnterpriseExpense[]>(initialEnterpriseExpenses);
  const [debts, setDebts] = useState<Debt[]>(initialDebts);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [bonsCommandes, setBonsCommandes] = useState<BonCommande[]>(initialBonsCommandes);
  const [paymentCommands, setPaymentCommands] = useState<PaymentCommand[]>(initialPaymentCommands);
  const [enterpriseSettings, setEnterpriseSettings] = useState<EnterpriseSettings>(initialEnterpriseSettings);

  // ============================================================
  // Create default settings if none exist
  // ============================================================
  const createDefaultSettings = async (createdById: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('enterprise_settings')
        .insert({
          created_by_id: createdById,
          company_name: 'ERP System',
          logo_url: ''
        });

      if (error) {
        console.error('Error creating default settings:', error);
      }
    } catch (error) {
      console.error('Exception creating default settings:', error);
    }
  };

  // ============================================================
  // Load enterprise settings - FIXED with maybeSingle()
  // ============================================================
  const loadEnterpriseSettings = async (createdById: string): Promise<void> => {
    try {
      // First try to load settings for current user
      let { data, error } = await supabase
        .from('enterprise_settings')
        .select('*')
        .eq('created_by_id', createdById)
        .maybeSingle();

      // If no settings for current user, get the first one (from any admin)
      if (!data && !error) {
        const { data: anySettings } = await supabase
          .from('enterprise_settings')
          .select('*')
          .limit(1)
          .single();
        data = anySettings;
      }

      console.log('📥 DataContext: loadEnterpriseSettings result:', {
        data: data,
        error: error,
        logoUrl: data?.logo_url,
        hasLogo: !!data?.logo_url
      });

      // Check for actual errors (not "no rows found")
      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error loading enterprise settings:', error);
        // Set defaults and return to avoid infinite loop
        setEnterpriseSettings({
          name: 'ERP System',
          logoUrl: '',
          address: '',
          phone: '',
          email: '',
          description: ''
        });
        return;
      }

      // If row exists, load it
      if (data) {
        console.log('✅ Settings found in DB:', {
          company_name: data.company_name,
          logo_url: data.logo_url,
          logo_url_type: typeof data.logo_url,
          logo_url_length: data.logo_url?.length
        });
        
        setEnterpriseSettings({
          name: data.company_name || 'ERP System',
          logoUrl: data.logo_url || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          description: data.description || '',
          nis: data.nis || '',
          nif: data.nif || '',
          rc: data.rc || '',
          article: data.article || ''
        });
      } else {
        // No row exists - set defaults (don't create, let user save first)
        console.log('⚠️ No enterprise settings found - using defaults');
        setEnterpriseSettings({
          name: 'ERP System',
          logoUrl: '',
          address: '',
          phone: '',
          email: '',
          description: '',
          nis: '',
          nif: '',
          rc: '',
          article: ''
        });
      }
    } catch (error) {
      console.error('❌ Exception loading enterprise settings:', error);
      // Fallback to defaults
      setEnterpriseSettings({
        name: 'ERP System',
        logoUrl: '',
        address: '',
        phone: '',
        email: '',
        description: '',
        nis: '',
        nif: '',
        rc: '',
        article: ''
      });
    }
  };

  // ============================================================
  // Load settings on user authentication
  // ============================================================
  useEffect(() => {
    if (user?.id) {
      loadEnterpriseSettings(user.id);
    }
  }, [user?.id]);

  // ============================================================
  // Real-time subscription to enterprise settings changes
  // ============================================================
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`enterprise_settings:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'enterprise_settings',
          filter: `created_by_id=eq.${user.id}`
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData?.created_by_id === user.id) {
            setEnterpriseSettings({
              name: newData.company_name || 'ERP System',
              logoUrl: newData.logo_url || '',
              address: newData.address || '',
              phone: newData.phone || '',
              email: newData.email || '',
              description: newData.description || '',
              nis: newData.nis || '',
              nif: newData.nif || '',
              rc: newData.rc || '',
              article: newData.article || ''
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <DataContext.Provider value={{
      commands, products, expenses, projectBoxes, categories, unities, suppliers,
      workers, workerExpenses, enterpriseExpenses, debts, appointments, bonsCommandes, paymentCommands,
      enterpriseSettings,
      updateEnterpriseSettings: (s) => setEnterpriseSettings(prev => ({ ...prev, ...s })),
      loadEnterpriseSettings,
      setCommands, setProducts, setExpenses, setProjectBoxes, setCategories, setUnities, setSuppliers,
      setWorkers, setWorkerExpenses, setEnterpriseExpenses, setDebts, setAppointments,
      setBonsCommandes, setPaymentCommands,
      addCommand: (c) => setCommands(p => [...p, c]),
      updateCommand: (id, d) => setCommands(p => p.map(c => c.id === id ? { ...c, ...d } : c)),
      deleteCommand: (id) => setCommands(p => p.filter(c => c.id !== id)),
      addProduct: (pr) => setProducts(p => [...p, pr]),
      updateProduct: (id, d) => setProducts(p => p.map(pr => pr.id === id ? { ...pr, ...d } : pr)),
      deleteProduct: (id) => setProducts(p => p.filter(pr => pr.id !== id)),
      addExpense: (e) => setExpenses(p => [...p, e]),
      updateExpense: (id, d) => setExpenses(p => p.map(e => e.id === id ? { ...e, ...d } : e)),
      deleteExpense: (id) => setExpenses(p => p.filter(e => e.id !== id)),
      addCategory: (c) => setCategories(p => [...p, c]),
      addUnity: (u) => setUnities(p => [...p, u]),
      addSupplier: (s) => setSuppliers(p => [...p, s]),
      addProjectBox: (pb) => setProjectBoxes(p => [...p, pb]),
      updateProjectBox: (id, d) => setProjectBoxes(p => p.map(pb => pb.id === id ? { ...pb, ...d } : pb)),
      deleteProjectBox: (id) => setProjectBoxes(p => p.filter(pb => pb.id !== id)),
      addWorker: (w) => setWorkers(p => [...p, w]),
      updateWorker: (id, d) => setWorkers(p => p.map(w => w.id === id ? { ...w, ...d } : w)),
      deleteWorker: (id) => setWorkers(p => p.filter(w => w.id !== id)),
      addWorkerExpense: (e) => setWorkerExpenses(p => [...p, e]),
      updateWorkerExpense: (id, d) => setWorkerExpenses(p => p.map(e => e.id === id ? { ...e, ...d } : e)),
      deleteWorkerExpense: (id) => setWorkerExpenses(p => p.filter(e => e.id !== id)),
      addEnterpriseExpense: (e) => setEnterpriseExpenses(p => [...p, e]),
      updateEnterpriseExpense: (id, d) => setEnterpriseExpenses(p => p.map(e => e.id === id ? { ...e, ...d } : e)),
      deleteEnterpriseExpense: (id) => setEnterpriseExpenses(p => p.filter(e => e.id !== id)),
      addDebt: (d) => setDebts(p => [...p, d]),
      updateDebt: (id, d) => setDebts(p => p.map(debt => debt.id === id ? { ...debt, ...d } : debt)),
      deleteDebt: (id) => setDebts(p => p.filter(d => d.id !== id)),
      addAppointment: (a) => setAppointments(p => [...p, a]),
      updateAppointment: (id, d) => setAppointments(p => p.map(a => a.id === id ? { ...a, ...d } : a)),
      deleteAppointment: (id) => setAppointments(p => p.filter(a => a.id !== id)),
      addBonCommande: (b) => setBonsCommandes(p => [...p, b]),
      updateBonCommande: (id, d) => setBonsCommandes(p => p.map(b => b.id === id ? { ...b, ...d } : b)),
      deleteBonCommande: (id) => setBonsCommandes(p => p.filter(b => b.id !== id)),
      addPaymentCommand: (pc) => setPaymentCommands(p => [...p, pc]),
      updatePaymentCommand: (id, d) => setPaymentCommands(p => p.map(pc => pc.id === id ? { ...pc, ...d } : pc)),
      deletePaymentCommand: (id) => setPaymentCommands(p => p.filter(pc => pc.id !== id)),
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be inside DataProvider');
  return ctx;
};
