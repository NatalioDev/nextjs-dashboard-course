'use server';

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";


const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string(),
})

const CreateInvoices = FormSchema.omit({id: true, date: true})

export async function createInvoices(formData:FormData) {
    const {customerId, amount, status} = CreateInvoices.parse({ 
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    // Guardamos el amount con decimales:
    const amountInCents = amount * 100;

    // Creamos y guardamos la fecha de creacion:
    const date = new Date().toISOString().split('T')[0];


    // Insertamos los datos en la db:
    await sql `
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;

    // Borrar este caché y activar una nueva solicitud al servidor
    revalidatePath('/dashboard/invoices');

    // Redirigir al usuario:
    redirect('/dashboard/invoices');
}

const UpdateInvoice = FormSchema.omit({id: true, date: true});

export async function updateInvoice(id:string, formData: FormData) {
    const { customerId, amount, status } = UpdateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    const amountInCents = amount * 100;

    await sql `
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
    `;

    revalidatePath('/dashboard/invoices');

    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id:string) {
    await sql `
        DELETE FROM invoices WHERE id = ${id}
    `;

    revalidatePath('/dashboard/invoices')
}