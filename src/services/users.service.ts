/**
 * BUSINESS LOGIC for authentication and the current user: registration (409 on taken
 * username/email), login (same 401 for unknown email and wrong password, constant-time),
 * reading and updating the user (re-hashes a new password). Every success returns the user
 * with a freshly signed token. Depends only on domain ports, injected by the container.
 */

import type { User } from '../domain/entities/user';
import { alreadyTaken, invalidCredentials, unauthenticated } from '../domain/errors';
import type { UserRepository } from '../domain/repositories';
import type { PasswordHasher, TokenService } from '../domain/security';
import type { AuthenticatedUser, LoginInput, RegisterInput, UpdateUserInput } from '../dtos/users.dto';

export class UsersService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async register(input: RegisterInput): Promise<AuthenticatedUser> {
    const taken = await this.users.takenFields(input);
    if (taken.length > 0) throw alreadyTaken(taken);

    const user = await this.users.create({
      email: input.email,
      username: input.username,
      passwordHash: await this.passwords.hash(input.password),
    });
    return this.authenticated(user);
  }

  async login(input: LoginInput): Promise<AuthenticatedUser> {
    const user = await this.users.findByEmail(input.email);
    // Always verified, even for an unknown email, so the two failures take the same time.
    const valid = await this.passwords.verify(input.password, user?.passwordHash);
    if (!user || !valid) throw invalidCredentials();
    return this.authenticated(user);
  }

  async current(userId: number): Promise<AuthenticatedUser> {
    const user = await this.users.findById(userId);
    if (!user) throw unauthenticated('is invalid');
    return this.authenticated(user);
  }

  async update(userId: number, input: UpdateUserInput): Promise<AuthenticatedUser> {
    const taken = await this.users.takenFields({ email: input.email, username: input.username }, userId);
    if (taken.length > 0) throw alreadyTaken(taken);

    const { password, ...fields } = input;
    const user = await this.users.update(userId, {
      ...fields,
      ...(password !== undefined && { passwordHash: await this.passwords.hash(password) }),
    });
    return this.authenticated(user);
  }

  private authenticated(user: User): AuthenticatedUser {
    return { user, token: this.tokens.sign(user.id) };
  }
}
