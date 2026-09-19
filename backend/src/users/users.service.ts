import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { UserRole } from '../common/enums';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  findAll(): Promise<User[]> {
    return this.repo.find({ order: { fullName: 'ASC' } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOneBy({ email });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.repo.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async createUser(data: { fullName: string; email: string; password: string; role?: UserRole }): Promise<User> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = this.repo.create({
      fullName: data.fullName,
      email: data.email,
      passwordHash,
      role: data.role ?? UserRole.VIEWER,
    });
    return this.repo.save(user);
  }
}
