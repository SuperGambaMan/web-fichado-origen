import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity } from '../audit/entities/audit-log.entity';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/auth.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async login(
    dto: LoginDto,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthTokens & { user: Partial<User> }> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      user,
      dto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('User account is not active');
    }

    await this.usersService.updateLastLogin(user.id);

    const tokens = await this.generateTokens(user);

    await this.auditService.log({
      userId: user.id,
      action: AuditAction.LOGIN,
      entityType: AuditEntity.SESSION,
      entityId: user.id,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      description: `User ${user.email} logged in`,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async validateUser(payload: JwtPayload): Promise<User | null> {
    return this.usersService.findOne(payload.sub);
  }

  async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken);
      const user = await this.usersService.findOne(payload.sub);

      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateAuthJsSession(sessionToken: string): Promise<User | null> {
    // This method validates sessions from Auth.js
    // The session token should be verified against the shared secret
    try {
      const authSecret = this.configService.get<string>('app.authSecret');

      // Verify the JWT token from Auth.js
      const payload = this.jwtService.verify(sessionToken, {
        secret: authSecret,
      });

      if (!payload.sub && !payload.email) {
        return null;
      }

      // Find user by email from the token
      const user = await this.usersService.findByEmail(payload.email);
      return user;
    } catch (error) {
      return null;
    }
  }

  async logout(
    userId: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    const user = await this.usersService.findOne(userId);

    await this.auditService.log({
      userId,
      action: AuditAction.LOGOUT,
      entityType: AuditEntity.SESSION,
      entityId: userId,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      description: `User ${user.email} logged out`,
    });
  }
}
