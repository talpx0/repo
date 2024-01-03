import { PrismaClient, Article } from '@prisma/client';

const prisma = new PrismaClient();


export interface ArticleWithTags extends Omit<Article, 'tags'> {
  tags: string[];
}

export async function getArticlesByRoutePath(path: string): Promise<ArticleWithTags[]> {
  const articles = await prisma.article.findMany({
    where: {
      route: {
        path: path,
      },
    },
    include: {
      route: true,
      tags: true, 
    },
  });

  return articles.map(article => ({
    ...article,
    tags: article.tags.map(tag => tag.name)
  }));
}

export async function insertMultipleRoutes(paths: string[]): Promise<void> {
    await prisma.route.createMany({
      data: paths.map(path => ({ path })),
      skipDuplicates: true, // Optionally skip duplicates
    });
  }