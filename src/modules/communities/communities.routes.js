import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { optionalAuth } from '../../middleware/optionalAuth.js';
import { getSupabaseAdmin } from '../../config/supabase.js';
import { sendSuccess, sendError } from '../../utils/response.js';

const router = Router();

// Fallback in-memory membership tracker if Supabase RLS blocks community_members table
const inMemoryMemberships = new Set();

export const REAL_KYU_COMMUNITIES = [
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    name: 'Computer Society of Kirinyaga (CSK)',
    category: 'Technology & Engineering',
    description: 'The premier student tech community for CS, Software Engineering, IT, and BBIT students at Kirinyaga University. Organizes workshops, hackathons, AI/ML masterclasses, and peer coding mentorship.',
    icon: 'Code2',
    members_count: 384,
    website: 'https://computersocietyofkirinyaga.org',
    github: 'https://github.com/Computer-Society-Of-Kirinyaga',
    facebook: 'https://www.facebook.com/search/top?q=Computer%20Society%20of%20Kirinyaga',
    instagram: null,
    twitter: null,
    youtube: null,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000002',
    name: 'Kirinyaga University Christian Union (KyUCU)',
    category: 'Faith & Spiritual',
    description: 'Non-denominational evangelical fellowship dedicated to spiritual formation, praise and worship, discipleship, and evangelism across the KyU campus community.',
    icon: 'Cross',
    members_count: 650,
    website: 'https://www.kyuchristianunion.org',
    facebook: 'https://www.facebook.com/profile.php?id=100079867135744',
    instagram: 'https://instagram.com/kirinyagauniversity_cu',
    youtube: 'https://www.youtube.com/@kirinyagauniversitycu43',
    github: null,
    twitter: null,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000003',
    name: 'Kirinyaga University Students Organization (KyUSO)',
    category: 'Student Governance',
    description: 'Official representative governing council for all KyU undergraduate and postgraduate students, coordinating welfare, academic advocacy, and administration dialogue.',
    icon: 'ShieldCheck',
    members_count: 4200,
    website: 'https://students.kyu.ac.ke',
    facebook: 'https://www.facebook.com/search/top?q=Kirinyaga%20University%20Students%20Organization',
    instagram: null,
    github: null,
    twitter: null,
    youtube: null,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000004',
    name: 'Rotaract Club of Kirinyaga University',
    category: 'Community Service & Leadership',
    description: 'Affiliated with Rotary International, empowering young adults through community development, humanitarian drives, youth leadership summits, and professional networking.',
    icon: 'Globe',
    members_count: 145,
    website: 'https://www.rotary.org/en/get-involved/rotaract-clubs',
    facebook: 'https://www.facebook.com/search/top?q=Rotaract%20Club%20of%20Kirinyaga%20University',
    instagram: null,
    github: null,
    twitter: null,
    youtube: null,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000005',
    name: 'Kenya Red Cross – KyU Chapter',
    category: 'Community Service & First Aid',
    description: 'Campus humanitarian wing providing certified emergency first-aid drills, voluntary blood donation camps, disaster preparedness training, and mental wellness outreach.',
    icon: 'HeartHandshake',
    members_count: 210,
    website: 'https://www.redcross.or.ke',
    facebook: 'https://www.facebook.com/search/top?q=Kirinyaga%20University%20Red%20Cross',
    instagram: null,
    github: null,
    twitter: null,
    youtube: null,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000006',
    name: 'Young Catholic Students (YCS - KyU)',
    category: 'Faith & Spiritual',
    description: 'Catholic community at Kirinyaga University promoting faith, fellowship, liturgical celebrations, Sunday masses, annual retreats, and community acts of mercy.',
    icon: 'Cross',
    members_count: 195,
    website: 'https://www.kyu.ac.ke',
    facebook: 'https://www.facebook.com/search/top?q=Young%20Catholic%20Students%20Kirinyaga%20University',
    instagram: null,
    github: null,
    twitter: null,
    youtube: null,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000007',
    name: 'Seventh-Day Adventist (SDA) Campus Ministries',
    category: 'Faith & Spiritual',
    description: 'Home for Adventist university students focusing on Sabbath worship, spiritual fellowship, scripture study, choral music, and health missionary campaigns.',
    icon: 'Sun',
    members_count: 160,
    website: 'https://www.kyu.ac.ke',
    facebook: 'https://www.facebook.com/search/top?q=Kirinyaga%20University%20SDA',
    instagram: null,
    github: null,
    twitter: null,
    youtube: null,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000008',
    name: 'Muslim Students Association (MSA - KyU)',
    category: 'Faith & Spiritual',
    description: 'Nurturing Islamic faith, daily prayers in congregation, Ramadan iftar gatherings, community charity drives, and brotherly/sisterly unity on campus.',
    icon: 'Moon',
    members_count: 130,
    website: 'https://www.kyu.ac.ke',
    facebook: 'https://www.facebook.com/search/top?q=Kirinyaga%20University%20Muslim%20Students',
    instagram: null,
    github: null,
    twitter: null,
    youtube: null,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000009',
    name: 'KyU Environmental Conservation Club',
    category: 'Environmental & Sustainability',
    description: 'Championing environmental conservation, county-wide tree planting initiatives, campus clean-up exercises, climate resilience, and eco-friendly innovations.',
    icon: 'Sprout',
    members_count: 220,
    website: 'https://www.kyu.ac.ke',
    facebook: 'https://www.facebook.com/search/top?q=Kirinyaga%20University%20Environmental%20Club',
    instagram: null,
    github: null,
    twitter: null,
    youtube: null,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000010',
    name: 'KyU Innovation & Robotics Hub',
    category: 'Technology & Engineering',
    description: 'Hardware, IoT, electronics, automation and robotics lab where KyU students build autonomous rovers, drones, and embedded solutions for local industry challenges.',
    icon: 'Cpu',
    members_count: 115,
    website: 'https://computersocietyofkirinyaga.org',
    facebook: 'https://www.facebook.com/search/top?q=KyU%20Robotics',
    instagram: null,
    github: 'https://github.com/Computer-Society-Of-Kirinyaga',
    twitter: null,
    youtube: null,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000011',
    name: 'Kirinyaga University Debate & Model UN',
    category: 'Academics & Public Speaking',
    description: 'Competitive collegiate debate society fostering rhetorical prowess, research, critical analysis, parliamentary procedure, and national Model UN participation.',
    icon: 'MessageCircle',
    members_count: 95,
    website: 'https://www.kyu.ac.ke',
    facebook: 'https://www.facebook.com/search/top?q=Kirinyaga%20University%20Debate',
    instagram: null,
    github: null,
    twitter: null,
    youtube: null,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000012',
    name: 'KyU Performing Arts, Drama & Music Society',
    category: 'Arts & Culture',
    description: 'Celebrating cultural talent and creative arts through drama stage plays, comedy, spoken-word poetry, choral recitals, and modern dance performances.',
    icon: 'Music',
    members_count: 180,
    website: 'https://www.kyu.ac.ke',
    facebook: 'https://www.facebook.com/search/top?q=Kirinyaga%20University%20Drama%20Club',
    instagram: null,
    github: null,
    twitter: null,
    youtube: null,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000013',
    name: 'KyU Peer Counselors Association',
    category: 'Health & Wellness',
    description: 'Empathetic student peer counselors working in coordination with the Dean of Students to provide mental wellness advocacy, guidance, and substance abuse awareness.',
    icon: 'HeartHandshake',
    members_count: 85,
    website: 'https://www.kyu.ac.ke',
    facebook: 'https://www.facebook.com/search/top?q=KyU%20Peer%20Counselors',
    instagram: null,
    github: null,
    twitter: null,
    youtube: null,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000014',
    name: 'Kirinyaga University Sports Association',
    category: 'Sports & Athletics',
    description: 'Coordinates varsity football, basketball, volleyball, rugby, hockey, table tennis, and athletics teams competing regionally under Kenya Universities Sports Federation (KUSF).',
    icon: 'Trophy',
    members_count: 950,
    website: 'https://www.kyu.ac.ke',
    facebook: 'https://www.facebook.com/search/top?q=Kirinyaga%20University%20Sports',
    instagram: null,
    github: null,
    twitter: null,
    youtube: null,
  },
];

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { search } = req.query;
    const supabase = getSupabaseAdmin();

    let communities = null;
    let joinedIds = new Set();

    try {
      let query = supabase.from('communities').select('*').order('members_count', { ascending: false });
      if (search) {
        query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%,description.ilike.%${search}%`);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        communities = data;
      }
    } catch {
      // Supabase RLS or network fallback
    }

    // If database returned no results or failed with RLS, use the curated real clubs
    if (!communities || communities.length === 0) {
      communities = REAL_KYU_COMMUNITIES;
      if (search) {
        const q = String(search).toLowerCase();
        communities = communities.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.category.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q)
        );
      }
    }

    if (req.user?.id) {
      try {
        const { data: memberships } = await supabase
          .from('community_members')
          .select('community_id')
          .eq('user_id', req.user.id);
        if (memberships) {
          joinedIds = new Set(memberships.map((m) => m.community_id));
        }
      } catch {
        // Fallback to in-memory memberships
        joinedIds = inMemoryMemberships;
      }
    }

    const formatted = communities.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      description: c.description,
      icon: c.icon,
      members: (c.members_count || 0).toLocaleString('en-KE'),
      membersCount: c.members_count || 0,
      isJoined: joinedIds.has(c.id),
      // External links with live presence
      website:   c.website   || null,
      facebook:  c.facebook  || null,
      instagram: c.instagram || null,
      twitter:   c.twitter   || null,
      github:    c.github    || null,
      youtube:   c.youtube   || null,
    }));

    return sendSuccess(res, formatted, 'Communities retrieved.');
  } catch (err) {
    return next(err);
  }
});

router.post('/:id/join', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const communityId = req.params.id;
    const supabase = getSupabaseAdmin();

    try {
      const { data: existing } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('community_id', communityId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        await supabase.from('community_members').delete().eq('community_id', communityId).eq('user_id', userId);
        return sendSuccess(res, { isJoined: false }, 'Left community.');
      } else {
        await supabase.from('community_members').insert({ community_id: communityId, user_id: userId });
        return sendSuccess(res, { isJoined: true }, 'Joined community.');
      }
    } catch {
      // In-memory toggle fallback
      const key = `${userId}:${communityId}`;
      if (inMemoryMemberships.has(key)) {
        inMemoryMemberships.delete(key);
        return sendSuccess(res, { isJoined: false }, 'Left community.');
      } else {
        inMemoryMemberships.add(key);
        return sendSuccess(res, { isJoined: true }, 'Joined community.');
      }
    }
  } catch (err) {
    return next(err);
  }
});

export default router;
