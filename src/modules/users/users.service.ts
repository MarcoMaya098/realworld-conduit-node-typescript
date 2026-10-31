import type { User } from '@prisma/client';
import { alreadyTaken, invalidCredentials, unauthorized } from '../../errors';
import { signToken } from '../../lib/jwt';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../../lib/password';
import { usersRepository } from './users.repository';
import type { LoginInput, RegisterInput, UpdateUserInput } from './users.schemas';

export interface UserDto {
  email: string;
  token: string;
  username: string;
  bio: string | null;
  image: string | null;
}

export function toUserDto(user: User): UserDto {
  return {
    email: user.email,
    token: signToken(user.id),
    username: user.username,
    bio: user.bio,
    image: user.image,
  };
}

export const usersService = {
  async register(input: RegisterInput): Promise<UserDto> {
    const taken = await usersRepository.takenFields(input);
    if (taken.length > 0) throw alreadyTaken(taken);

    const user = await usersRepository.create({
      email: input.email,
      username: input.username,
      passwordHash: await hashPassword(input.password),
    });
    return toUserDto(user);
  },

  async login(input: LoginInput): Promise<UserDto> {
    const user = await usersRepository.findByEmail(input.email);
    // Always run the hash comparison so an unknown email is not distinguishable by timing.
    const valid = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) throw invalidCredentials();
    return toUserDto(user);
  },

  async current(userId: number): Promise<UserDto> {
    const user = await usersRepository.findById(userId);
    if (!user) throw unauthorized('is invalid');
    return toUserDto(user);
  },

  async update(userId: number, input: UpdateUserInput): Promise<UserDto> {
    const taken = await usersRepository.takenFields({ email: input.email, username: input.username }, userId);
    if (taken.length > 0) throw alreadyTaken(taken);

    const { password, ...fields } = input;
    const user = await usersRepository.update(userId, {
      ...fields,
      ...(password !== undefined && { passwordHash: await hashPassword(password) }),
    });
    return toUserDto(user);
  },
};
