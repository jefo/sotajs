import { z } from 'zod';

const PostPropsSchema = z.object({
  id: z.string().uuid(),
  authorId: z.string().uuid(),
  title: z.string().min(5, { message: 'Title must be at least 5 characters long' }),
  content: z.string().min(20, { message: 'Content must be at least 20 characters long' }),
  status: z.enum(['draft', 'published']),
});

type PostProps = z.infer<typeof PostPropsSchema>;

export class Post {
  private readonly props: PostProps;

  private constructor(props: PostProps) {
    this.props = props;
  }

  get id(): string { return this.props.id; }
  get authorId(): string { return this.props.authorId; }
  get title(): string { return this.props.title; }
  get content(): string { return this.props.content; }
  get status(): string { return this.props.status; }

  get state(): Readonly<PostProps> {
    return this.props;
  }

  public static create(data: { authorId: string, title: string, content: string }): Post {
    const props = PostPropsSchema.parse({
      id: crypto.randomUUID(),
      authorId: data.authorId,
      title: data.title,
      content: data.content,
      status: 'draft',
    });
    return new Post(props);
  }

  public publish(): void {
    if (this.props.status === 'published') {
      throw new Error('Post is already published.');
    }
    this.props.status = 'published';
  }
}
