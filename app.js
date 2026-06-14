/* ============================================================
 * FindMyPet — Supabase data layer
 * Talks to the project at znudsfvfgdytdkgdnyxk.supabase.co using
 * the schema in supabase-schema.sql (profiles / listings / threads /
 * messages / bookings + the "pet-photos" storage bucket).
 *
 * Pages must load the Supabase JS library before this file:
 *   <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
 *   <script src="app.js"></script>
 * ============================================================ */

const SUPABASE_URL = 'https://znudsfvfgdytdkgdnyxk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1XBpn1OAVtaXhWUuXLQX3Q_Ef4Fs0bU';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const THREAD_SELECT = `
  id, listing_id, owner_id, finder_id, last_message, last_message_at, created_at,
  owner:profiles!threads_owner_id_fkey(name),
  finder:profiles!threads_finder_id_fkey(name),
  listing:listings(pet_name, pet_type)
`;

function listingFromRow(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.profiles ? row.profiles.name : '',
    petName: row.pet_name,
    petType: row.pet_type,
    breed: row.breed,
    color: row.color,
    age: row.age,
    photo: row.photo_url,
    location: row.location,
    dateSeen: row.date_seen,
    description: row.description,
    reward: row.reward,
    status: row.status,
    archived: row.archived,
    postedAt: new Date(row.created_at).getTime(),
  };
}

function threadFromRow(row) {
  return {
    id: row.id,
    listingId: row.listing_id,
    userId1: row.owner_id,
    userName1: row.owner ? row.owner.name : '',
    userId2: row.finder_id,
    userName2: row.finder ? row.finder.name : '',
    petName: row.listing ? row.listing.pet_name : '',
    petType: row.listing ? row.listing.pet_type : 'other',
    lastMsg: row.last_message || '',
    lastAt: row.last_message_at ? new Date(row.last_message_at).getTime() : new Date(row.created_at).getTime(),
    createdAt: new Date(row.created_at).getTime(),
  };
}

function messageFromRow(row) {
  return {
    id: row.id,
    senderId: row.sender_id,
    text: row.body || '',
    photo: row.photo_url || null,
    sentAt: new Date(row.sent_at).getTime(),
  };
}

function bookingFromRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    listingId: row.listing_id,
    petName: row.pet_name,
    location: row.location,
    phone: row.phone,
    notes: row.notes,
    status: row.status,
    bookedAt: new Date(row.booked_at).getTime(),
  };
}

const FMP = {

  supabase: sb,

  /* ── LISTINGS ── */
  async getListings() {
    const { data, error } = await sb.from('listings')
      .select('*, profiles(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(listingFromRow);
  },
  async getListing(id) {
    const { data, error } = await sb.from('listings')
      .select('*, profiles(name)')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return listingFromRow(data);
  },
  async getUserListings(userId) {
    const { data, error } = await sb.from('listings')
      .select('*, profiles(name)')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(listingFromRow);
  },
  async addListing(data) {
    const { data: row, error } = await sb.from('listings')
      .insert({
        owner_id: data.ownerId,
        pet_name: data.petName,
        pet_type: data.petType,
        breed: data.breed,
        color: data.color,
        age: data.age,
        photo_url: data.photo,
        location: data.location,
        date_seen: data.dateSeen,
        description: data.description,
        reward: data.reward,
      })
      .select('*, profiles(name)')
      .single();
    if (error) throw error;
    return listingFromRow(row);
  },
  async solveListing(id) {
    const { error } = await sb.from('listings').update({ status: 'solved' }).eq('id', id);
    if (error) throw error;
  },
  async archiveListing(id, archived) {
    const { error } = await sb.from('listings').update({ archived }).eq('id', id);
    if (error) throw error;
  },
  async deleteListing(id) {
    const { error } = await sb.from('listings').delete().eq('id', id);
    if (error) throw error;
  },

  /* ── USERS / AUTH ── */
  async getUser() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data: profile } = await sb.from('profiles')
      .select('name, phone, created_at')
      .eq('id', user.id)
      .maybeSingle();
    return {
      id: user.id,
      email: user.email,
      name: profile ? profile.name : (user.user_metadata && user.user_metadata.name) || '',
      phone: profile ? profile.phone : '',
      createdAt: profile ? profile.created_at : user.created_at,
    };
  },
  async registerUser({ name, email, phone, password }) {
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { name, phone } },
    });
    if (error) return { error: error.message };
    return { user: data.user, session: data.session };
  },
  async loginUser(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { user: data.user };
  },
  async oauthLogin(provider) {
    // Provider must be enabled with OAuth credentials under
    // Supabase Dashboard → Authentication → Providers.
    const providerMap = { google: 'google', microsoft: 'azure', apple: 'apple' };
    const { error } = await sb.auth.signInWithOAuth({
      provider: providerMap[provider] || provider,
      options: { redirectTo: window.location.origin + window.location.pathname.replace(/[^/]*$/, 'index.html') },
    });
    if (error) return { error: error.message };
    return {}; // browser redirects to the provider; nothing more to do here
  },
  async updateProfile(userId, { name, phone }) {
    const { error } = await sb.from('profiles').update({ name, phone }).eq('id', userId);
    if (error) throw error;
  },
  async logout() {
    await sb.auth.signOut();
  },
  async requireAuth(redirectBack) {
    const user = await this.getUser();
    if (!user) {
      const next = redirectBack || window.location.href;
      window.location.href = 'auth.html?next=' + encodeURIComponent(next);
      return null;
    }
    return user;
  },

  /* ── MESSAGES ── */
  async getOrCreateThread(listingId, ownerId, finderId) {
    const { data: existing } = await sb.from('threads')
      .select(THREAD_SELECT)
      .eq('listing_id', listingId)
      .eq('owner_id', ownerId)
      .eq('finder_id', finderId)
      .maybeSingle();
    if (existing) return threadFromRow(existing);

    const { data, error } = await sb.from('threads')
      .insert({ listing_id: listingId, owner_id: ownerId, finder_id: finderId })
      .select(THREAD_SELECT)
      .single();
    if (error) throw error;
    return threadFromRow(data);
  },
  async getUserThreads(userId) {
    const { data, error } = await sb.from('threads')
      .select(THREAD_SELECT)
      .or(`owner_id.eq.${userId},finder_id.eq.${userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    if (error) throw error;
    return (data || []).map(threadFromRow);
  },
  async getMessages(threadId) {
    const { data, error } = await sb.from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('sent_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(messageFromRow);
  },
  async sendMessage(threadId, senderId, text, photoUrl) {
    const { data, error } = await sb.from('messages')
      .insert({ thread_id: threadId, sender_id: senderId, body: text || null, photo_url: photoUrl || null })
      .select('*')
      .single();
    if (error) throw error;
    return messageFromRow(data);
  },

  /* ── PHOTO UPLOADS (Supabase Storage, bucket "pet-photos") ── */
  async uploadPhoto(file, folder) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await sb.storage.from('pet-photos').upload(path, file);
    if (error) throw error;
    return sb.storage.from('pet-photos').getPublicUrl(path).data.publicUrl;
  },

  /* ── PROFESSIONAL FINDER BOOKINGS ── */
  async addBooking(data) {
    const { data: row, error } = await sb.from('bookings')
      .insert({
        user_id: data.userId,
        listing_id: data.listingId || null,
        pet_name: data.petName,
        location: data.location,
        phone: data.phone,
        notes: data.notes || null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return bookingFromRow(row);
  },
  async getUserBookings(userId) {
    const { data, error } = await sb.from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('booked_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(bookingFromRow);
  },

  /* ── UTILITIES ── */
  esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },
  getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  },
  formatDate(ts) {
    return new Date(ts).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  },
  timeAgo(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  },
  petEmoji(type) {
    return { dog: '🐕', cat: '🐱', bird: '🦜', other: '🐾' }[type] || '🐾';
  },

  /* ── HEADER ── */
  // Call this on every page to sync the header auth state.
  async initHeader(headerNavSelector) {
    const nav = document.querySelector(headerNavSelector || '.header-nav');
    if (!nav) return;
    const user = await this.getUser();
    if (user) {
      nav.innerHTML = `
        <a href="profile.html" style="color:#ddd">Hi, ${this.esc(user.name.split(' ')[0])}</a>
        <span style="color:#2a2a2a">|</span>
        <a href="#" onclick="FMP.logout().then(()=>window.location.href='index.html');return false" style="color:#555">Sign Out</a>
      `;
    }
    // if not logged in the default Sign In / Register links stay
  }
};

window.FMP = FMP;
