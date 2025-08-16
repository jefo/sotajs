import { createPort } from '../../di';
import { Post } from './post.aggregate';

export const savePostPort = createPort<(post: Post) => Promise<void>>();
