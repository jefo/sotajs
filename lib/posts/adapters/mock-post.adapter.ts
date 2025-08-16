import { Post } from '../domain/post.aggregate';

/**
 * This is a mock (or dummy) adapter for the savePostPort.
 * In a real application, this would be replaced by an adapter
 * that interacts with a real database (e.g., Prisma, TypeORM).
 * For now, it just simulates saving by logging to the console.
 */
export const mockSavePostAdapter = async (post: Post): Promise<void> => {
  console.log(`[Mock DB] Saving post: ${post.title} (ID: ${post.id})`);
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 50));
};
