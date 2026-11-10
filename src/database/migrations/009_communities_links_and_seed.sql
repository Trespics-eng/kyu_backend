-- Migration 009: Add external link columns to communities + seed real KyU clubs
-- ============================================================================

-- 1. Add social/web link columns to communities table
ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS website    TEXT,
  ADD COLUMN IF NOT EXISTS facebook   TEXT,
  ADD COLUMN IF NOT EXISTS instagram  TEXT,
  ADD COLUMN IF NOT EXISTS twitter    TEXT,
  ADD COLUMN IF NOT EXISTS github     TEXT,
  ADD COLUMN IF NOT EXISTS youtube    TEXT;

-- 2. Seed real KyU clubs & societies
-- Uses INSERT ... ON CONFLICT (name) DO UPDATE so it is idempotent.

INSERT INTO communities (name, category, description, icon, members_count, website, facebook, instagram, github, youtube)
VALUES

  -- Computer Society of Kirinyaga (CSK)
  (
    'Computer Society of Kirinyaga',
    'Technology',
    'The official tech community for CS, SE, BBIT and IT students at KyU. We run coding workshops, hackathons, AI/ML tracks and peer mentorship sessions.',
    'Code2',
    320,
    'https://computersocietyofkirinyaga.org',
    NULL,
    NULL,
    'https://github.com/Computer-Society-Of-Kirinyaga',
    NULL
  ),

  -- KyU Christian Union
  (
    'Kirinyaga University Christian Union',
    'Faith & Spiritual',
    'KyUCU exists to proclaim the Lord Jesus Christ to the university community through fellowship, worship, evangelism and discipleship.',
    'Cross',
    580,
    'https://www.kyuchristianunion.org',
    'https://www.facebook.com/profile.php?id=100079867135744',
    'https://instagram.com/kirinyagauniversity_cu',
    NULL,
    'https://www.youtube.com/@kirinyagauniversitycu43'
  ),

  -- Kirinyaga University Students Organization
  (
    'KyUSO – Students Organization',
    'Student Governance',
    'The official student governing body of Kirinyaga University, representing all students and bridging communication with university administration.',
    'ShieldCheck',
    4200,
    'https://students.kyu.ac.ke',
    NULL,
    NULL,
    NULL,
    NULL
  ),

  -- Rotaract Club
  (
    'Rotaract Club of Kirinyaga University',
    'Community Service',
    'Part of the global Rotaract network, we develop young leaders through community service, professional development and international goodwill.',
    'Globe',
    95,
    'https://www.rotary.org/en/get-involved/rotaract-clubs',
    NULL,
    NULL,
    NULL,
    NULL
  ),

  -- Red Cross Society
  (
    'Kenya Red Cross – KyU Chapter',
    'Community Service',
    'First aid training, blood drives, disaster response, peer counselling and humanitarian volunteering for KyU students.',
    'HeartHandshake',
    140,
    'https://www.redcross.or.ke',
    NULL,
    NULL,
    NULL,
    NULL
  ),

  -- Muslim Students Association
  (
    'Muslim Students Association (MSA)',
    'Faith & Spiritual',
    'Fostering Islamic values, brotherhood and sisterhood through prayers, da''wah activities and community engagement at Kirinyaga University.',
    'Moon',
    110,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  ),

  -- Young Catholic Students
  (
    'Young Catholic Students (YCS)',
    'Faith & Spiritual',
    'Catholic community on campus promoting faith, justice and service through liturgy, retreats and social action projects.',
    'Cross',
    130,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  ),

  -- SDA Student Chapter
  (
    'Seventh-Day Adventist (SDA) Campus Chapter',
    'Faith & Spiritual',
    'Nurturing Adventist faith on campus through worship services, evangelism, health advocacy and community outreach programs.',
    'Sun',
    90,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  ),

  -- Environmental Club
  (
    'KyU Environmental Conservation Club',
    'Environment',
    'Championing sustainability at Kirinyaga University through tree-planting drives, clean-up campaigns and environmental education.',
    'Sprout',
    160,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  ),

  -- Innovation & Robotics Hub
  (
    'KyU Innovation & Robotics Hub',
    'Technology',
    'Hands-on engineering and innovation space where students design, prototype and compete with robots and IoT projects.',
    'Cpu',
    85,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  ),

  -- Debate & Model UN
  (
    'Debate Society & Model UN',
    'Academics',
    'Build critical thinking, public speaking and diplomacy skills through competitive debates and Model United Nations simulations.',
    'MessageCircle',
    70,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  ),

  -- Performing Arts
  (
    'KyU Performing Arts & Drama Club',
    'Arts & Culture',
    'Theatre, spoken word, traditional dance and modern performance arts — celebrating creative expression at Kirinyaga University.',
    'Music',
    120,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  ),

  -- Peer Counselors
  (
    'KyU Peer Counselors',
    'Health & Wellness',
    'Trained peer counsellors offering mental health support, referrals and wellness campaigns for the KyU student community.',
    'HeartHandshake',
    55,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  ),

  -- Business & Finance Club
  (
    'KyU Business & Finance Club',
    'Business',
    'Connecting business-minded students through entrepreneurship pitches, investment talks, mentorship and industry site visits.',
    'Briefcase',
    200,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  ),

  -- Sports Association
  (
    'KyU Sports Association',
    'Sports',
    'Coordinating KyU athletes across football, basketball, volleyball, athletics and more under the Kenya Universities Sports Federation (KUSF).',
    'Trophy',
    900,
    'https://www.kyu.ac.ke',
    NULL,
    NULL,
    NULL,
    NULL
  )

ON CONFLICT (name) DO UPDATE
  SET
    category    = EXCLUDED.category,
    description = EXCLUDED.description,
    icon        = EXCLUDED.icon,
    website     = COALESCE(EXCLUDED.website,   communities.website),
    facebook    = COALESCE(EXCLUDED.facebook,  communities.facebook),
    instagram   = COALESCE(EXCLUDED.instagram, communities.instagram),
    github      = COALESCE(EXCLUDED.github,    communities.github),
    youtube     = COALESCE(EXCLUDED.youtube,   communities.youtube);

