import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';

describe('PushController', () => {
  let controller: PushController;
  const saveSubscription = jest.fn();
  const deleteSubscription = jest.fn();
  const getVapidPublicKey = jest.fn().mockReturnValue('test-pub');

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PushController],
      providers: [
        {
          provide: PushService,
          useValue: {
            saveSubscription,
            deleteSubscription,
            getVapidPublicKey,
          },
        },
      ],
    }).compile();

    controller = module.get<PushController>(PushController);
  });

  it('getVapidPublicKey returns service key', () => {
    expect(controller.getVapidPublicKey()).toEqual({ publicKey: 'test-pub' });
  });

  it('subscribe uses req.user.id (JwtStrategy user shape)', async () => {
    const dto = {
      endpoint: 'https://push.example/e',
      keys: { p256dh: 'x', auth: 'y' },
    };
    await controller.subscribe({ user: { id: 'user-1' } }, dto);
    expect(saveSubscription).toHaveBeenCalledWith('user-1', dto);
  });

  it('subscribe throws when user id missing', () => {
    expect(() =>
      controller.subscribe({ user: {} } as any, {
        endpoint: 'e',
        keys: { p256dh: 'x', auth: 'y' },
      }),
    ).toThrow(UnauthorizedException);
  });

  it('unsubscribe uses req.user.id', async () => {
    await controller.unsubscribe({ user: { id: 'user-2' } }, 'https://push.example/e');
    expect(deleteSubscription).toHaveBeenCalledWith('user-2', 'https://push.example/e');
  });
});
