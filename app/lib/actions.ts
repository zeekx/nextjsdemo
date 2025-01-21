'use server';

import { date, z } from 'zod';
import { sql, db } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { REACT_LOADABLE_MANIFEST } from 'next/dist/shared/lib/constants';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['paid', 'pending']),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
    const { customerId, amount, status } = CreateInvoice.parse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    const conn = await db.connect();
    try {
        await conn.sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
      `;
    } catch (error) {
        console.error('Database connection failed:', error);
        throw new Error('Failed to create invoice');
    } finally {
        conn.release();
    }
   
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
  }

  const UpdateInvoice = FormSchema.omit({id: true, date: true });

  export async function updateInvoice(id: string, formData: FormData) {
    const { customerId, amount, status } = UpdateInvoice.parse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });
    const amountInCents = amount * 100;
    const conn = await db.connect();
    await conn.sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount=${amountInCents}, status=${status}
        WHERE id=${id}
      `;
    conn.release();

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
  }

export async function deleteInvoice(id: string) {
    const conn = await db.connect();
    await conn.sql`
        DELETE FROM invoices
        WHERE id=${id}
      `;
    conn.release();

    revalidatePath('/dashboard/invoices');
}