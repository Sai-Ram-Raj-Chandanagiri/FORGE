export interface Collaborator {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    username: string;
    avatarUrl: string | null;
  };
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    username: string;
    avatarUrl: string | null;
  };
  parentId: string | null;
  replies: Comment[];
}

export interface ProjectData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  repositoryUrl: string | null;
  isPublic: boolean;
  stars: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string | null;
    username: string;
    avatarUrl: string | null;
    bio: string | null;
  };
  tags: { tag: { name: string; slug: string } }[];
  collaborators: Collaborator[];
  comments: Comment[];
  _count: { comments: number; stars: number };
  isStarred: boolean;
}
