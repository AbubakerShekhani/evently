import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createUser, deleteUser, updateUser } from '@/lib/actions/user.action'
import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
 
export async function POST(req: Request) {
 
    // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
    const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET
   
    if (!WEBHOOK_SECRET) {
      throw new Error('Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
    }
   
    // Get the headers
    const headerPayload = headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");
   
    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response('Error occured -- no svix headers', {
        status: 400
      })
    }
   
    // Get the body
    const payload = await req.json()
    const body = JSON.stringify(payload);
   
    // Create a new Svix instance with your secret.
    const wh = new Webhook(WEBHOOK_SECRET);
   
    let evt: WebhookEvent
   
    // Verify the payload with the headers
    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent
    } catch (err) {
      console.error('Error verifying webhook:', err);
      return new Response('Error occured', {
        status: 400
      })
    }
   
    // Get the ID and type
    const { id } = evt.data;
    const eventType = evt.type;
   
    /*
        {
        backup_code_enabled: false,
        banned: false,
        create_organization_enabled: true,
        created_at: 1723655147534,
        delete_self_enabled: true,
        email_addresses: [
            {
            created_at: 1723655016665,
            email_address: 'abubakershekhani@yahoo.com',
            id: 'idn_2kerjDvEkkSAPi1loceRsa5cog9',
            linked_to: [],
            object: 'email_address',
            reserved: false,
            updated_at: 1723655147556,
            verification: [Object]
            }
        ],
        external_accounts: [],
        external_id: null,
        first_name: null,
        has_image: false,
        id: 'user_2kerzjYiQFhFNCQW0pGVYmVoC48',
        image_url: 'https://img.clerk.com/eyJ0eXBlIjoiZGVmYXVsdCIsImlpZCI6Imluc18ya1JDZWhDaEp0WENyUHFzV3RXQUtyRU51RW8iLCJyaWQiOiJ1c2VyXzJrZXJ6allpUUZoRk5DUVcwcEdWWW1Wb0M0OCJ9',
        last_active_at: 1723655147532,
        last_name: null,
        last_sign_in_at: null,
        locked: false,
        lockout_expires_in_seconds: null,
        mfa_disabled_at: null,
        mfa_enabled_at: null,
        object: 'user',
        passkeys: [],
        password_enabled: true,
        phone_numbers: [],
        primary_email_address_id: 'idn_2kerjDvEkkSAPi1loceRsa5cog9',
        primary_phone_number_id: null,
        primary_web3_wallet_id: null,
        private_metadata: {},
        profile_image_url: 'https://www.gravatar.com/avatar?d=mp',
        public_metadata: {},
        saml_accounts: [],
        totp_enabled: false,
        two_factor_enabled: false,
        unsafe_metadata: {},
        updated_at: 1723655147575,
        username: 'abubaker',
        verification_attempts_remaining: 100,
        web3_wallets: []
        }
    */

    if(eventType === 'user.created') {
        console.log(evt.data);  
        
        const { id, email_addresses, image_url, first_name, last_name, username } = evt.data;

        const user = {
            clerkId: id,
            email: email_addresses[0].email_address,
            username: username!,
            firstName: first_name!,
            lastName: last_name!,
            photo: image_url,
        }

        const newUser = await createUser(user);

        if(newUser) {
            await clerkClient.users.updateUserMetadata(id, {
                publicMetadata: {
                userId: newUser._id
                }
            })
        }

        return NextResponse.json({ message: 'OK', user: newUser })
    }

    
    if (eventType === 'user.updated') {
      const {id, image_url, first_name, last_name, username } = evt.data
  
      const user = {
        firstName: first_name,
        lastName: last_name,
        username: username!,
        photo: image_url,
      }
  
      const updatedUser = await updateUser(id, user)
  
      return NextResponse.json({ message: 'OK', user: updatedUser })
    }
    
    
    if (eventType === 'user.deleted') {
      const { id } = evt.data
  
      const deletedUser = await deleteUser(id!)
  
      return NextResponse.json({ message: 'OK', user: deletedUser })
    }
   
    return new Response('', { status: 200 })
  }