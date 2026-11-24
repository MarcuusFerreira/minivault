import { User } from '../../../domain/entities/user.entity.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import { LoginUseCase } from './login.use-case.js';

const ana = User.register({ id: 'u1', name: 'Ana', email: Email.create('ana@x.co'), passwordHash: 'stored', now: new Date(0) });

function setup() {
  const verified: (string | null)[] = [];
  const useCase = new LoginUseCase(
    {
      add: async () => {},
      findById: async () => null,
      findByEmail: async (email) => (email.value === 'ana@x.co' ? ana : null),
    },
    {
      hash: async () => 'stored',
      verify: async (password, hash) => {
        verified.push(hash);
        return hash !== null && password === 'right';
      },
    },
    { issue: async (userId) => ({ token: `token-${userId}`, expiresIn: 1800 }), verify: async () => null },
  );
  return { useCase, verified };
}

describe('LoginUseCase', () => {
  it('issues a token for the right password', async () => {
    const result = await setup().useCase.execute({ email: 'ANA@x.co', password: 'right' });
    expect(result).toMatchObject({ accessToken: 'token-u1', expiresIn: 1800, user: { id: 'u1' } });
  });

  it('answers an unknown email exactly like a wrong password, doing the same work', async () => {
    const { useCase, verified } = setup();
    const errorOf = (email: string) => useCase.execute({ email, password: 'wrong' }).catch((e: Error) => e);
    const [unknown, wrong] = [await errorOf('nobody@x.co'), await errorOf('ana@x.co')];
    expect(unknown).toMatchObject({ code: 'INVALID_CREDENTIALS', kind: 'unauthenticated' });
    expect(unknown).toEqual(wrong);
    expect(verified).toEqual([null, 'stored']);
  });

  it('treats a malformed email as an unknown one', async () => {
    const { useCase, verified } = setup();
    await expect(useCase.execute({ email: 'nonsense', password: 'x' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(verified).toEqual([null]);
  });
});
