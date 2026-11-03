import { getSupabaseAdmin } from '../../config/supabase.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export async function getArticles(req, res, next) {
  try {
    const { category, search } = req.query;
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('articles')
      .select(`
        *,
        author:profiles(id, name, initials, color, avatar_url)
      `)
      .eq('is_draft', false)
      .order('created_at', { ascending: false });

    if (category && category !== 'All stories') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,body.ilike.%${search}%`);
    }

    const { data: rawArticles, error } = await query;
    if (error) return sendError(res, error.message, 500);

    const formatted = (rawArticles || []).map((a) => ({
      id: a.id,
      title: a.title,
      excerpt: a.excerpt,
      category: a.category,
      author: a.author?.name || 'KyU Contributor',
      date: new Date(a.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }),
      read: a.read_time || '4 min read',
      image: a.cover_image_url || '/assets/campus-study.jpg',
      body: a.body,
      likes: a.likes_count,
    }));

    return sendSuccess(res, formatted, 'Articles retrieved.');
  } catch (err) {
    return next(err);
  }
}

export async function createArticle(req, res, next) {
  try {
    const userId = req.user.id;
    const { id, title, excerpt, body, category, tags, image, publish } = req.body;
    const supabase = getSupabaseAdmin();

    const tagList = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
    const readTime = `${Math.max(1, Math.ceil(body.split(/\s+/).length / 210))} min read`;

    const payload = {
      author_id: userId,
      title: title.trim(),
      excerpt: excerpt?.trim() || body.slice(0, 140),
      body: body.trim(),
      category: category || 'Campus Life',
      tags: tagList,
      cover_image_url: image || '/assets/campus-study.jpg',
      read_time: readTime,
      is_draft: !publish,
    };

    let result;
    if (id) {
      result = await supabase.from('articles').update(payload).eq('id', id).eq('author_id', userId).select().single();
    } else {
      result = await supabase.from('articles').insert(payload).select().single();
    }

    if (result.error) return sendError(res, result.error.message, 500);

    return sendSuccess(res, result.data, publish ? 'Story published successfully.' : 'Draft saved.', null, 201);
  } catch (err) {
    return next(err);
  }
}

export async function getDrafts(req, res, next) {
  try {
    const userId = req.user.id;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('author_id', userId)
      .eq('is_draft', true)
      .order('updated_at', { ascending: false });

    if (error) return sendError(res, error.message, 500);

    const formatted = (data || []).map((draft) => ({
      id: draft.id,
      title: draft.title,
      excerpt: draft.excerpt,
      category: draft.category,
      body: draft.body,
      date: new Date(draft.updated_at || draft.created_at).toLocaleDateString(),
      image: draft.cover_image_url,
      tags: (draft.tags || []).join(', '),
    }));

    return sendSuccess(res, formatted, 'User drafts.');
  } catch (err) {
    return next(err);
  }
}

export async function deleteDraft(req, res, next) {
  try {
    const userId = req.user.id;
    const draftId = req.params.id;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', draftId)
      .eq('author_id', userId)
      .eq('is_draft', true);

    if (error) return sendError(res, error.message, 500);

    return sendSuccess(res, null, 'Draft deleted.');
  } catch (err) {
    return next(err);
  }
}

export async function getArticleById(req, res, next) {
  try {
    const { id } = req.params;
    const supabase = getSupabaseAdmin();

    const [articleRes, commentsRes] = await Promise.all([
      supabase
        .from('articles')
        .select(`
          *,
          author:profiles(id, name, initials, color, role, avatar_url)
        `)
        .eq('id', id)
        .single(),
      supabase
        .from('article_comments')
        .select(`
          id,
          body,
          created_at,
          author:profiles(id, name, initials, color, avatar_url)
        `)
        .eq('article_id', id)
        .order('created_at', { ascending: true }),
    ]);

    if (articleRes.error || !articleRes.data) {
      return sendError(res, 'Article not found.', 404);
    }

    const a = articleRes.data;
    let isLiked = false;
    let isSaved = false;

    if (req.user?.id) {
      const [likeRes, saveRes] = await Promise.all([
        supabase.from('article_likes').select('article_id').eq('article_id', id).eq('user_id', req.user.id).maybeSingle(),
        supabase.from('article_bookmarks').select('article_id').eq('article_id', id).eq('user_id', req.user.id).maybeSingle(),
      ]);
      isLiked = !!likeRes.data;
      isSaved = !!saveRes.data;
    }

    return sendSuccess(res, {
      id: a.id,
      title: a.title,
      excerpt: a.excerpt,
      category: a.category,
      author: a.author?.name || 'KyU Contributor',
      authorDetails: a.author,
      date: new Date(a.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }),
      read: a.read_time,
      image: a.cover_image_url || '/assets/campus-study.jpg',
      body: a.body,
      tags: a.tags || [],
      likes: a.likes_count,
      isLiked,
      isSaved,
      comments: commentsRes.data || [],
    }, 'Article retrieved.');
  } catch (err) {
    return next(err);
  }
}

export async function toggleArticleLike(req, res, next) {
  try {
    const userId = req.user.id;
    const articleId = req.params.id;
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from('article_likes')
      .select('article_id')
      .eq('article_id', articleId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('article_likes').delete().eq('article_id', articleId).eq('user_id', userId);
      await supabase.rpc('decrement_article_likes', { art_id: articleId }).catch(() => null);
      return sendSuccess(res, { liked: false }, 'Like removed.');
    } else {
      await supabase.from('article_likes').insert({ article_id: articleId, user_id: userId });
      return sendSuccess(res, { liked: true }, 'Article liked.');
    }
  } catch (err) {
    return next(err);
  }
}

export async function addArticleComment(req, res, next) {
  try {
    const userId = req.user.id;
    const articleId = req.params.id;
    const { text } = req.body;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('article_comments')
      .insert({
        article_id: articleId,
        author_id: userId,
        body: text,
      })
      .select(`
        id,
        body,
        created_at,
        author:profiles(id, name, initials, color, avatar_url)
      `)
      .single();

    if (error) return sendError(res, error.message, 500);

    return sendSuccess(res, data, 'Comment added to article.', null, 201);
  } catch (err) {
    return next(err);
  }
}

