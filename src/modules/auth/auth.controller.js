import { getSupabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../config/logger.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { sendWelcomeEmail } from '../../services/email.service.js';

export async function register(req, res, next) {
  try {
    const { email, password, name, category, school, department, course, year, avatar_url, color } = req.body;
    const supabase = getSupabaseAdmin();

    const normalizedEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // 1. Create confirmed Auth user using Supabase Admin API.
    // Using admin.createUser with email_confirm: true bypasses Supabase's rate-limited
    // internal auth email delivery, preventing 400 and 500 registration errors.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { name: cleanName, category },
    });

    if (authError) {
      const errorMsg = authError.message || '';
      const isAlreadyRegistered =
        errorMsg.toLowerCase().includes('already') ||
        errorMsg.toLowerCase().includes('registered') ||
        authError.status === 422;

      if (isAlreadyRegistered) {
        return sendError(res, 'An account with this email address already exists. Please sign in.', 409);
      }
      return sendError(res, authError.message, 400);
    }

    const userId = authData?.user?.id;
    if (!userId) {
      return sendError(res, 'Could not create account. Please try again.', 500);
    }

    const initials = cleanName.split(/\s+/).map((p) => p[0] || '').slice(0, 2).join('').toUpperCase();
    const roleString = `${category}${course ? ` · ${course}` : department ? ` · ${department}` : ''}`;

    // 2. Insert into profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        name: cleanName,
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
      logger.error({ err: profileError }, 'Failed to save user profile in profiles table');
      return sendError(res, 'Account was created but profile setup failed: ' + profileError.message, 500);
    }

    // 3. Initialize user settings
    try {
      await supabase.from('user_settings').upsert({ user_id: userId });
    } catch {
      // non-fatal
    }

    // 4. Sign in immediately to provide session access & refresh tokens to client
    let session = null;
    try {
      const { data: loginData } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (loginData?.session) {
        session = loginData.session;
      }
    } catch (loginErr) {
      logger.warn({ err: loginErr }, 'Auto-sign in session acquisition was skipped');
    }

    // 5. Send welcome email via Brevo with platform name and logo
    try {
      await sendWelcomeEmail({
        email: normalizedEmail,
        name: cleanName,
        category,
      });
    } catch (emailErr) {
      logger.error({ err: emailErr }, 'Failed to send welcome email via Brevo');
    }

    return sendSuccess(res, {
      user: authData.user,
      session,
      profile,
    }, 'Account created successfully. Welcome to KyU Connect!', null, 201);
  } catch (err) {
    return next(err);
  }
}

export async function adminRegister(req, res, next) {
  try {
    const { email, password, name, department, roleTitle, adminCode } = req.body;
    const supabase = getSupabaseAdmin();

    // Check optional admin registration passcode if configured in environment
    const requiredCode = process.env.ADMIN_REGISTRATION_KEY || process.env.ADMIN_REGISTRATION_SECRET;
    if (requiredCode && adminCode !== requiredCode) {
      return sendError(res, 'Invalid admin registration security code.', 403);
    }

    let userId = null;
    let authUser = null;

    // First attempt: create confirmed auth user using Supabase Admin API
    const { data: adminUserData, error: adminUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, category: 'University Staff', app_role: 'admin' },
    });

    if (adminUserError) {
      const errorMsg = adminUserError.message || '';
      const isAlreadyRegistered =
        errorMsg.toLowerCase().includes('already') ||
        errorMsg.toLowerCase().includes('registered') ||
        adminUserError.status === 422;

      if (isAlreadyRegistered) {
        // If the account already exists, check if provided password is valid for this user
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInErr || !signInData?.user) {
          return sendError(res, 'An account with this email address already exists. Please sign in with your password.', 409);
        }

        // Credentials match! Promote this user to admin
        userId = signInData.user.id;
        authUser = signInData.user;
      } else {
        // Fallback: standard signUp if admin API has other errors
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, category: 'University Staff' },
          },
        });

        if (signUpError) {
          return sendError(res, signUpError.message, 400);
        }

        userId = signUpData.user?.id;
        authUser = signUpData.user;
      }
    } else {
      userId = adminUserData.user?.id;
      authUser = adminUserData.user;
    }

    if (!userId) {
      return sendError(res, 'Could not create administrator account.', 500);
    }

    const initials = name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
    const roleString = roleTitle?.trim() || (department?.trim() ? `Administrator · ${department.trim()}` : 'System Administrator');

    // Upsert into profiles with app_role: 'admin' and verified: true
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        name: name.trim(),
        initials,
        role: roleString,
        category: 'University Staff',
        school: department?.trim() || 'Administration',
        department: department?.trim() || 'Administration',
        course: null,
        year: null,
        avatar_url: null,
        color: '#0d9488',
        verified: true,
        app_role: 'admin',
      })
      .select()
      .single();

    if (profileError) {
      return sendError(res, profileError.message, 500);
    }

    // Initialize user settings safely
    try {
      await supabase.from('user_settings').upsert({ user_id: userId });
    } catch {
      // non-fatal
    }

    // Try signing in immediately so an access token can be returned for instant login
    let session = null;
    const { data: loginData } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (loginData?.session) {
      session = loginData.session;
    }

    return sendSuccess(res, {
      user: authUser,
      session,
      profile,
    }, 'Administrator account registered successfully.', null, 201);
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

export async function refresh(req, res, next) {
  try {
    const refreshToken = String(req.body?.refresh_token || '').trim();
    if (!refreshToken) return sendError(res, 'A refresh token is required.', 400);
    const { data, error } = await getSupabaseAdmin().auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) return sendError(res, 'Your session has expired. Please sign in again.', 401);
    return sendSuccess(res, { user: data.user, session: data.session }, 'Session refreshed.');
  } catch (err) { return next(err); }
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

