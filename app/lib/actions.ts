'use server';

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";


const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer'
    }),
    amount: z.coerce
        .number()
        .gt(0, {message: 'Please enter an amount greater than $0.'}),
    status: z.enum(['pending', 'paid'],{
        invalid_type_error: 'Please select an invoice status.',
    }),
    date: z.string(),
})

const CreateInvoices = FormSchema.omit({id: true, date: true})

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null;
};



export async function createInvoices(prevState: State, formData:FormData) {
    // Validate form fields using Zod
    const validatedFields = CreateInvoices.safeParse({ 
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    // If form validation fails, return errors early. Otherwise, continue.

    if (!validatedFields.success) {
        return{
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.',
        };
    };

    // Prepare data for insertion into the database
    const {customerId, amount, status} = validatedFields.data;

    // Guardamos el amount con decimales:
    const amountInCents = amount * 100;

    // Creamos y guardamos la fecha de creacion:
    const date = new Date().toISOString().split('T')[0];


    // Insertamos los datos en la db:
    try {
    await sql `
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
    } catch (error) {
        return{
            message: 'Database Error: Failed to Create Invoice.'
        }
    }


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


    try {    
    await sql `
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
    `;    
    } catch (error) {
        return {
            message: 'Database Error: Failed to Update Invoice.'
        }
    }



    revalidatePath('/dashboard/invoices');

    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id:string) {
    try {
    await sql 
        `DELETE FROM invoices WHERE id = ${id}`;
        revalidatePath('/dashboard/invoices')
        return{
            message: 'Deleted Invoices.'
        }
    } catch (error) {
        return {
            message: 'Database Error: Failed to Delete Invoice.'
        }
    }


}