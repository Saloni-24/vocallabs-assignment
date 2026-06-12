import { createClient } from '@nhost/nhost-js'

const subdomain = import.meta.env.VITE_NHOST_SUBDOMAIN?.trim()
const region = import.meta.env.VITE_NHOST_REGION?.trim()

export const nhost = subdomain && region ? createClient({ subdomain, region }) : createClient()
