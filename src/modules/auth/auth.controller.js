import { getSupabaseAdmin } from '../../config/supabase.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export async function register(req, res, next) {
  try {
    const { email, password, name, category, school, department, course, year, avatar_url, color } = req.body;
    const supabase = getSupabaseAdmin();

    // 1. Create Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, category },
      },
    });

    if (authError) {
      return sendError(res, authError.message, 400);
    }

    const userId = authData.user?.id;
    if (!userId) {
      return sendError(res, 'Could not create account.', 500);
    }

    const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
    const roleString = `${category}${course ? ` · ${course}` : department ? ` · ${department}` : ''}`;

    // 2. Insert into profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        name,
        initials,
        role: roleString,
        category,
        school: school || department || null,
        department: department || school || null,
        course: course || null,
        year: year || null,
        avatar_url: avatar_url || null,
        color: color || '#d6eee8',
        verified: false,
        app_role: 'user',
      })
      .select()
      .single();

    if (profileError) {
      return sendError(res, profileError.message, 500);
    }

    // 3. Initialize user settings
    await supabase.from('user_settings').upsert({ user_id: userId }).catch(() => null);

    return sendSuccess(res, {
      user: authData.user,
      session: authData.session,
      profile,
    }, 'Account created successfully.', null, 201);
  } catch (err) {
    return next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return sendError(res, error?.message || 'Invalid email or password.', 401);
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return sendSuccess(res, {
      user: data.user,
      session: data.session,
      profile: profile || {
        id: data.user.id,
        name: data.user.user_metadata?.name || email.split('@')[0],
        email,
      },
    }, 'Signed in successfully.');
  } catch (err) {
    return next(err);
  }
}

export async function logout(req, res, next) {
  try {
    if (req.supabase) {
      await req.supabase.auth.signOut().catch(() => null);
    }
    return sendSuccess(res, null, 'Logged out successfully.');
  } catch (err) {
    return next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.headers.origin || 'http://localhost:3000'}/login`,
    });

    if (error) {
      return sendError(res, error.message, 400);
    }

    return sendSuccess(res, null, 'If an account exists, password recovery instructions have been sent.');
  } catch (err) {
    return next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const userId = req.user.id;
    const supabase = getSupabaseAdmin();

    const [profileRes, settingsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_settings').select('*').eq('user_id', userId).single(),
    ]);

    return sendSuccess(res, {
      user: req.user,
      profile: profileRes.data,
      settings: settingsRes.data,
    }, 'Current user retrieved.');
  } catch (err) {
    return next(err);
  }
}

