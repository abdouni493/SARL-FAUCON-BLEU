import { supabase } from './supabase';

/**
 * Generates the next document ID with the format: prefix-YYYY-XXXX
 * @param table The Supabase table name
 * @param prefix The prefix (e.g., 'cmd', 'pur', 'bc')
 * @param column The column name containing the human-readable ID
 * @returns The generated ID string
 */
export const generateNextId = async (table: string, prefix: string, column: string = 'command_id'): Promise<string> => {
  const year = new Date().getFullYear();
  const searchPattern = `${prefix.toLowerCase()}-${year}-%`;
  
  try {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .ilike(column, searchPattern)
      .order(column, { ascending: false })
      .limit(1);
      
    if (error) {
      console.error(`Error fetching last ID from ${table}:`, error);
      // Fallback if table doesn't exist yet or query fails
      return `${prefix.toLowerCase()}-${year}-0001`;
    }
      
    let nextNum = 1;
    if (data && data.length > 0) {
      const lastId = data[0][column];
      const parts = lastId.split('-');
      const lastNumStr = parts[parts.length - 1];
      const lastNum = parseInt(lastNumStr);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }
    
    return `${prefix.toLowerCase()}-${year}-${String(nextNum).padStart(4, '0')}`;
  } catch (err) {
    console.error(`Unexpected error generating ID for ${table}:`, err);
    return `${prefix.toLowerCase()}-${year}-0001`;
  }
};
