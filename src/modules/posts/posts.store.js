import crypto from 'node:crypto';

const AI_BOT_PROFILE = {
  id: 'a1000000-0000-0000-0000-000000000001',
  name: 'Professor James Warui',
  role: 'Community Intelligence',
  department: 'Kirinyaga University Updates',
  verified: true,
  initials: 'JW',
  color: '#0d9488',
  avatar_url: null,
};

// Seed with default initial campus posts
export const postMemoryStore = [
  {
    id: 'p1000000-0000-0000-0000-000000000001',
    author: AI_BOT_PROFILE,
    author_id: AI_BOT_PROFILE.id,
    category: 'Campus Life',
    type: 'Announcement',
    body: 'Welcome to KyUConnect! The automated AI Intelligence Agent is continuously monitoring verified news, campus updates, and club activities for the Kirinyaga University community.',
    likes: 42,
    likes_count: 42,
    comments: [],
    comments_count: 0,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    isLiked: false,
    isBookmarked: false,
  },
  {
    id: 'p1000000-0000-0000-0000-000000000002',
    author: {
      id: 'a1000000-0000-0000-0000-000000000002',
      name: 'Computer Society of Kirinyaga',
      role: 'Student Tech Society',
      department: 'School of Computing',
      verified: true,
      initials: 'CS',
      color: '#2563eb',
      avatar_url: null,
    },
    author_id: 'a1000000-0000-0000-0000-000000000002',
    category: 'Opportunities',
    type: 'Announcement',
    body: 'Registration is now open for the upcoming KyU Hackathon & Web3 Workshop! Explore our projects and mentorship tracks at https://computersocietyofkirinyaga.org',
    likes: 68,
    likes_count: 68,
    comments: [],
    comments_count: 0,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    isLiked: false,
    isBookmarked: false,
  },
  {
    id: 'p1000000-0000-0000-0000-000000000003',
    author: {
      id: 'a1000000-0000-0000-0000-000000000003',
      name: 'KyU Christian Union',
      role: 'Campus Fellowship',
      department: 'Chaplaincy',
      verified: true,
      initials: 'CU',
      color: '#e11d48',
      avatar_url: null,
    },
    author_id: 'a1000000-0000-0000-0000-000000000003',
    category: 'Events',
    type: 'Announcement',
    body: 'Join us every Friday evening for fellowship and worship, and on Sundays at 8:30 AM. Livestreams and details available at https://www.kyuchristianunion.org',
    likes: 85,
    likes_count: 85,
    comments: [],
    comments_count: 0,
    created_at: new Date(Date.now() - 14400000).toISOString(),
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    isLiked: false,
    isBookmarked: false,
  }
];

export function addPostToMemoryStore(post) {
  if (!post || !post.id) return;
  const existingIdx = postMemoryStore.findIndex((p) => p.id === post.id);
  if (existingIdx !== -1) {
    postMemoryStore[existingIdx] = { ...postMemoryStore[existingIdx], ...post };
  } else {
    postMemoryStore.unshift(post);
  }
}

export function updatePostInMemoryStore(id, updates) {
  if (!id || !updates) return null;
  const existingIdx = postMemoryStore.findIndex((p) => p.id === id);
  if (existingIdx !== -1) {
    postMemoryStore[existingIdx] = {
      ...postMemoryStore[existingIdx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return postMemoryStore[existingIdx];
  }
  return null;
}

export function deletePostFromMemoryStore(id) {
  if (!id) return false;
  const existingIdx = postMemoryStore.findIndex((p) => p.id === id);
  if (existingIdx !== -1) {
    postMemoryStore.splice(existingIdx, 1);
    return true;
  }
  return false;
}

export function getPostsFromMemoryStore(category = null, limit = 15) {
  let list = [...postMemoryStore];
  if (category && category !== 'All Posts' && category !== 'Latest' && category !== 'Popular') {
    list = list.filter((p) => (p.category || '').toLowerCase() === category.toLowerCase());
  }
  return list.slice(0, limit);
}
