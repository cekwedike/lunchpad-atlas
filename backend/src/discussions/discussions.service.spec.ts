import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DiscussionsService } from './discussions.service';
import { PrismaService } from '../prisma.service';
import { DiscussionScoringService } from './discussion-scoring.service';
import { DiscussionsGateway } from './discussions.gateway';
import { NotificationsService } from '../notifications/notifications.service';

describe('DiscussionsService', () => {
  let service: DiscussionsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    discussion: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    discussionComment: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    discussionLike: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    resource: {
      findUnique: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
    },
    pointsLog: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockDiscussionScoringService = {
    scoreDiscussion: jest.fn(),
  };

  const mockDiscussionsGateway = {
    broadcastNewDiscussion: jest.fn(),
    broadcastNewComment: jest.fn(),
  };

  const mockNotificationsService = {
    notifyBulkNewDiscussion: jest.fn(),
    notifyDiscussionReply: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscussionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: DiscussionScoringService, useValue: mockDiscussionScoringService },
        { provide: DiscussionsGateway, useValue: mockDiscussionsGateway },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<DiscussionsService>(DiscussionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDiscussion', () => {
    it('should successfully create a new discussion', async () => {
      const userId = '123';
      const createDto = {
        title: 'Test Discussion',
        content: 'This is a test discussion post',
        cohortId: 'cohort-1',
        resourceId: 'resource-1',
      };

      mockPrismaService.resource.findUnique.mockResolvedValue({
        id: 'resource-1',
        sessionId: 'session-1',
        session: { cohortId: 'cohort-1' },
      });
      mockPrismaService.session.findUnique.mockResolvedValue({
        id: 'session-1',
        sessionNumber: 1,
        title: 'Session 1',
      });
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const mockDiscussion = {
        id: 'disc-1',
        ...createDto,
        userId,
        user: {
          id: userId,
          firstName: 'John',
          lastName: 'Doe',
        },
        resource: {
          id: 'resource-1',
          title: 'Resource Title',
        },
      };

      mockPrismaService.discussion.create.mockResolvedValue(mockDiscussion);

      const result = await service.createDiscussion(userId, 'ADMIN', createDto);

      expect(result).toEqual(
        expect.objectContaining({
          id: mockDiscussion.id,
          title: mockDiscussion.title,
          pointsAwarded: 5,
        }),
      );
      expect(mockPrismaService.discussion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: createDto.title,
          content: createDto.content,
          userId,
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('getDiscussions', () => {
    const userId = '123';

    it('should return paginated discussions', async () => {
      const filters = { page: 1, limit: 10 };

      const mockDiscussions = [
        {
          id: 'disc-1',
          title: 'Test Discussion',
          content: 'Content',
          isPinned: false,
          user: { id: '123', firstName: 'John', lastName: 'Doe' },
          _count: { comments: 5, likes: 3 },
        },
      ];

      mockPrismaService.discussion.findMany.mockResolvedValue(mockDiscussions);
      mockPrismaService.discussion.count.mockResolvedValue(1);

      const result = await service.getDiscussions(filters, 'ADMIN', userId);

      expect(result).toEqual({
        data: mockDiscussions.map((discussion) => ({
          ...discussion,
          session: null,
        })),
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter discussions by search term', async () => {
      const filters = { search: 'career', page: 1, limit: 10 };

      mockPrismaService.discussion.findMany.mockResolvedValue([]);
      mockPrismaService.discussion.count.mockResolvedValue(0);

      await service.getDiscussions(filters, 'ADMIN', userId);

      expect(mockPrismaService.discussion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { title: { contains: 'career', mode: 'insensitive' } },
              { content: { contains: 'career', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });
  });

  describe('likeDiscussion', () => {
    it('should add a like if not already liked', async () => {
      const discussionId = 'disc-1';
      const userId = '123';

      mockPrismaService.discussionLike.findUnique.mockResolvedValue(null);
      mockPrismaService.discussionLike.create.mockResolvedValue({
        id: 'like-1',
        discussionId,
        userId,
      });

      const result = await service.likeDiscussion(discussionId, userId);

      expect(result).toEqual({ liked: true });
      expect(mockPrismaService.discussionLike.create).toHaveBeenCalledWith({
        data: { discussionId, userId },
      });
    });

    it('should remove a like if already liked', async () => {
      const discussionId = 'disc-1';
      const userId = '123';

      mockPrismaService.discussionLike.findUnique.mockResolvedValue({
        id: 'like-1',
        discussionId,
        userId,
      });

      const result = await service.likeDiscussion(discussionId, userId);

      expect(result).toEqual({ liked: false });
      expect(mockPrismaService.discussionLike.delete).toHaveBeenCalledWith({
        where: { id: 'like-1' },
      });
    });
  });

  describe('createComment', () => {
    it('should successfully create a comment', async () => {
      const discussionId = 'disc-1';
      const userId = '123';
      const createDto = {
        content: 'This is a test comment',
      };

      const mockDiscussion = { id: discussionId };
      const mockComment = {
        id: 'comment-1',
        discussionId,
        userId,
        content: createDto.content,
        user: {
          id: userId,
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      mockPrismaService.discussion.findUnique.mockResolvedValue({
        ...mockDiscussion,
        isLocked: false,
        userId,
      });
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.discussionComment.create.mockResolvedValue(mockComment);

      const result = await service.createComment(
        discussionId,
        userId,
        createDto,
      );

      expect(result).toEqual(mockComment);
    });

    it('should throw NotFoundException if discussion does not exist', async () => {
      mockPrismaService.discussion.findUnique.mockResolvedValue(null);

      await expect(
        service.createComment('nonexistent', '123', { content: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
