import { z } from 'zod';
import { usePort } from '../../di';
import { Post } from '../domain/post.aggregate';
import { savePostPort } from '../domain/post.ports';
import { loggerPort } from '../../../ports/logger.port';

export const CreatePostInputSchema = z.object({
  authorId: z.string().uuid({ message: 'Invalid author ID' }),
  title: z.string(),
  content: z.string(),
});

export type CreatePostInput = z.infer<typeof CreatePostInputSchema>;

export const createPostUseCase = async (input: CreatePostInput) => {
  const validInput = CreatePostInputSchema.parse(input);

  const savePost = usePort(savePostPort);
  const logger = usePort(loggerPort)(); // Get the logger instance

  logger.info('Creating a new post...', { authorId: validInput.authorId });

  const post = Post.create(validInput);

  await savePost(post);

  logger.info(`Post with ID ${post.id} created successfully.`, { postId: post.id });

  return { postId: post.id };
};
