---
description: 後端服務開發標準流程與最佳實踐
---

# Backend Service 後端服務開發

## 概述

此 skill 提供後端服務開發的完整指引，涵蓋 RESTful API 設計、微服務架構、服務間通訊、錯誤處理、日誌記錄等關鍵技術領域，確保開發高品質、可維護、可擴展的後端服務。

## 適用角色

| 角色 | 職責 |
|------|------|
| **主要負責** | 後端工程師、資深開發者 |
| **協作角色** | 架構師、DevOps 工程師、前端工程師 |
| **審核人員** | 技術主管、資深工程師 |

## 輸入需求

- [ ] API 規格文件（OpenAPI/Swagger）
- [ ] 資料模型設計（ERD）
- [ ] 非功能性需求（效能、安全、可用性）
- [ ] 整合需求（第三方服務、內部服務）

---

## 1. 服務架構設計

### 1.1 分層架構（Layered Architecture）

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway / Load Balancer               │
├─────────────────────────────────────────────────────────────┤
│                     Controller Layer                         │
│           (Request Handling, Validation, Response)           │
├─────────────────────────────────────────────────────────────┤
│                      Service Layer                           │
│              (Business Logic, Orchestration)                 │
├─────────────────────────────────────────────────────────────┤
│                     Repository Layer                         │
│               (Data Access, ORM, Caching)                    │
├─────────────────────────────────────────────────────────────┤
│                     Infrastructure                           │
│          (Database, Message Queue, External APIs)            │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 目錄結構（Node.js/TypeScript 範例）

```
src/
├── api/                    # API 層
│   ├── controllers/        # Request handlers
│   ├── middlewares/        # Express middlewares
│   ├── validators/         # Request validation
│   └── routes/             # Route definitions
├── services/               # Business logic
│   ├── user.service.ts
│   └── order.service.ts
├── repositories/           # Data access
│   ├── user.repository.ts
│   └── order.repository.ts
├── models/                 # Data models
│   ├── entities/           # Database entities
│   ├── dto/                # Data Transfer Objects
│   └── mappers/            # Entity-DTO mappers
├── infrastructure/         # External integrations
│   ├── database/           # DB configuration
│   ├── cache/              # Redis/Cache
│   ├── messaging/          # Message queue
│   └── external/           # Third-party APIs
├── common/                 # Shared utilities
│   ├── errors/             # Custom errors
│   ├── constants/          # Constants
│   ├── decorators/         # Custom decorators
│   └── utils/              # Helper functions
├── config/                 # Configuration
│   ├── app.config.ts
│   ├── database.config.ts
│   └── index.ts
├── types/                  # TypeScript types
└── app.ts                  # Application entry
```

---

## 2. RESTful API 設計

### 2.1 URL 命名規範

```yaml
# 使用名詞複數形式
GET    /api/v1/users           # 獲取用戶列表
GET    /api/v1/users/:id       # 獲取單一用戶
POST   /api/v1/users           # 創建用戶
PUT    /api/v1/users/:id       # 完整更新用戶
PATCH  /api/v1/users/:id       # 部分更新用戶
DELETE /api/v1/users/:id       # 刪除用戶

# 巢狀資源
GET    /api/v1/users/:id/orders         # 獲取用戶的訂單
POST   /api/v1/users/:id/orders         # 為用戶創建訂單
GET    /api/v1/users/:id/orders/:orderId

# 動作型 API（非 CRUD 操作）
POST   /api/v1/users/:id/activate       # 啟用用戶
POST   /api/v1/orders/:id/cancel        # 取消訂單
POST   /api/v1/payments/:id/refund      # 退款
```

### 2.2 HTTP 狀態碼使用

```typescript
// 成功回應
200 OK              // 成功（GET, PUT, PATCH）
201 Created         // 創建成功（POST）
204 No Content      // 成功無內容（DELETE）

// 客戶端錯誤
400 Bad Request     // 請求格式錯誤
401 Unauthorized    // 未認證
403 Forbidden       // 無權限
404 Not Found       // 資源不存在
409 Conflict        // 資源衝突
422 Unprocessable Entity  // 驗證失敗
429 Too Many Requests     // 請求過多

// 服務端錯誤
500 Internal Server Error // 伺服器錯誤
502 Bad Gateway           // 閘道錯誤
503 Service Unavailable   // 服務不可用
504 Gateway Timeout       // 閘道超時
```

### 2.3 統一回應格式

```typescript
// 成功回應
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  timestamp: string;
  requestId: string;
}

// 錯誤回應
interface ErrorResponse {
  success: false;
  error: {
    code: string;         // 業務錯誤碼
    message: string;      // 用戶友好訊息
    details?: unknown[];  // 詳細錯誤資訊
  };
  timestamp: string;
  requestId: string;
}

// 範例回應
{
  "success": true,
  "data": {
    "id": "usr_123456",
    "email": "user@example.com",
    "name": "張三",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_abc123"
}
```

---

## 3. 服務實作模式

### 3.1 Controller 實作

```typescript
// src/api/controllers/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../../services/user.service';
import { CreateUserDto, UpdateUserDto } from '../../models/dto/user.dto';
import { validate } from '../../api/validators';
import { SuccessResponse } from '../../common/responses';

export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * @route GET /api/v1/users
   * @description 獲取用戶列表（支援分頁與篩選）
   */
  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, status, search } = req.query;
      
      const result = await this.userService.findAll({
        page: Number(page),
        limit: Math.min(Number(limit), 100), // 最大限制 100
        status: status as string,
        search: search as string,
      });

      return res.json(SuccessResponse.paginated(result.data, result.meta));
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/users/:id
   * @description 獲取單一用戶
   */
  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await this.userService.findById(id);
      return res.json(SuccessResponse.ok(user));
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route POST /api/v1/users
   * @description 創建新用戶
   */
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = await validate(CreateUserDto, req.body);
      const user = await this.userService.create(dto);
      return res.status(201).json(SuccessResponse.created(user));
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route PUT /api/v1/users/:id
   * @description 更新用戶
   */
  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const dto = await validate(UpdateUserDto, req.body);
      const user = await this.userService.update(id, dto);
      return res.json(SuccessResponse.ok(user));
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route DELETE /api/v1/users/:id
   * @description 刪除用戶
   */
  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await this.userService.delete(id);
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
```

### 3.2 Service 實作

```typescript
// src/services/user.service.ts
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../models/dto/user.dto';
import { UserMapper } from '../models/mappers/user.mapper';
import { NotFoundError, ConflictError } from '../common/errors';
import { EventEmitter } from '../infrastructure/messaging/events';
import { CacheService } from '../infrastructure/cache';
import { Logger } from '../common/utils/logger';

export class UserService {
  private readonly logger = Logger.getLogger('UserService');
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    private readonly userRepository: UserRepository,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter,
  ) {}

  async findById(id: string): Promise<UserResponseDto> {
    // 嘗試從快取獲取
    const cacheKey = `user:${id}`;
    const cached = await this.cacheService.get<UserResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for user', { id });
      return cached;
    }

    // 從資料庫獲取
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('USER_NOT_FOUND', `用戶 ${id} 不存在`);
    }

    const dto = UserMapper.toDto(user);
    
    // 寫入快取
    await this.cacheService.set(cacheKey, dto, this.CACHE_TTL);
    
    return dto;
  }

  async findAll(options: FindAllOptions): Promise<PaginatedResult<UserResponseDto>> {
    const { data, total } = await this.userRepository.findAll(options);
    
    return {
      data: data.map(UserMapper.toDto),
      meta: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit),
      },
    };
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    // 檢查 email 是否已存在
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError('EMAIL_EXISTS', '此 Email 已被註冊');
    }

    // 密碼加密
    const hashedPassword = await this.hashPassword(dto.password);

    // 創建用戶
    const user = await this.userRepository.create({
      ...dto,
      password: hashedPassword,
    });

    this.logger.info('User created', { userId: user.id });

    // 發送事件
    this.eventEmitter.emit('user.created', {
      userId: user.id,
      email: user.email,
    });

    return UserMapper.toDto(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('USER_NOT_FOUND', `用戶 ${id} 不存在`);
    }

    const updated = await this.userRepository.update(id, dto);
    
    // 清除快取
    await this.cacheService.delete(`user:${id}`);
    
    this.logger.info('User updated', { userId: id });

    return UserMapper.toDto(updated);
  }

  async delete(id: string): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('USER_NOT_FOUND', `用戶 ${id} 不存在`);
    }

    // 軟刪除
    await this.userRepository.softDelete(id);
    
    // 清除快取
    await this.cacheService.delete(`user:${id}`);
    
    this.logger.info('User deleted', { userId: id });

    // 發送事件
    this.eventEmitter.emit('user.deleted', { userId: id });
  }
}
```

### 3.3 Repository 實作

```typescript
// src/repositories/user.repository.ts
import { PrismaClient, User, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';

export class UserRepository extends BaseRepository<User> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'user');
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findAll(options: FindAllOptions): Promise<{ data: User[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      deletedAt: null, // 排除軟刪除
    };

    if (options.status) {
      where.status = options.status;
    }

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { email: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
```

---

## 4. 錯誤處理

### 4.1 自定義錯誤類別

```typescript
// src/common/errors/app-error.ts
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;
  readonly isOperational: boolean;

  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 具體錯誤類別
export class BadRequestError extends AppError {
  readonly statusCode = 400;
  constructor(
    public readonly code: string = 'BAD_REQUEST',
    message: string,
    details?: unknown,
  ) {
    super(message, details);
  }
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  constructor(
    public readonly code: string = 'UNAUTHORIZED',
    message: string = '請先登入',
  ) {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  constructor(
    public readonly code: string = 'FORBIDDEN',
    message: string = '權限不足',
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  constructor(
    public readonly code: string = 'NOT_FOUND',
    message: string = '資源不存在',
  ) {
    super(message);
  }
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  constructor(
    public readonly code: string = 'CONFLICT',
    message: string,
    details?: unknown,
  ) {
    super(message, details);
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 422;
  constructor(
    public readonly code: string = 'VALIDATION_ERROR',
    message: string,
    details?: unknown[],
  ) {
    super(message, details);
  }
}
```

### 4.2 全局錯誤處理中介軟體

```typescript
// src/api/middlewares/error-handler.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../../common/errors';
import { Logger } from '../../common/utils/logger';
import { ErrorResponse } from '../../common/responses';

const logger = Logger.getLogger('ErrorHandler');

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.headers['x-request-id'] as string;

  // 處理自定義應用錯誤
  if (error instanceof AppError) {
    // 記錄警告（可預期的錯誤）
    logger.warn('Application error', {
      code: error.code,
      message: error.message,
      path: req.path,
      method: req.method,
      requestId,
    });

    res.status(error.statusCode).json(
      ErrorResponse.error(error.code, error.message, error.details),
    );
    return;
  }

  // 處理未預期的錯誤
  logger.error('Unexpected error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    requestId,
  });

  // 生產環境不暴露錯誤詳情
  const message =
    process.env.NODE_ENV === 'production'
      ? '伺服器發生錯誤，請稍後再試'
      : error.message;

  res.status(500).json(
    ErrorResponse.error('INTERNAL_ERROR', message),
  );
}
```

---

## 5. 日誌記錄

### 5.1 結構化日誌

```typescript
// src/common/utils/logger.ts
import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

export class Logger {
  private static loggers: Map<string, winston.Logger> = new Map();

  static getLogger(context: string): winston.Logger {
    if (!this.loggers.has(context)) {
      const logger = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: logFormat,
        defaultMeta: { context },
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple(),
            ),
          }),
          // 生產環境輸出到檔案或外部服務
          ...(process.env.NODE_ENV === 'production'
            ? [
                new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
                new winston.transports.File({ filename: 'logs/combined.log' }),
              ]
            : []),
        ],
      });
      this.loggers.set(context, logger);
    }
    return this.loggers.get(context)!;
  }
}
```

### 5.2 請求日誌中介軟體

```typescript
// src/api/middlewares/request-logger.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../common/utils/logger';

const logger = Logger.getLogger('HTTP');

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  // 生成 Request ID
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  const startTime = Date.now();

  // 記錄請求
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });

  // 記錄回應
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
}
```

---

## 6. 驗證與安全

### 6.1 請求驗證（class-validator）

```typescript
// src/models/dto/user.dto.ts
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsEmail({}, { message: '請輸入有效的 Email 格式' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @IsString()
  @MinLength(8, { message: '密碼至少需要 8 個字元' })
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: '密碼需包含大小寫字母和數字',
  })
  password!: string;

  @IsString()
  @MinLength(2, { message: '姓名至少需要 2 個字元' })
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(/^09\d{8}$/, { message: '請輸入有效的手機號碼' })
  phone?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'suspended'])
  status?: string;
}
```

### 6.2 驗證函數

```typescript
// src/api/validators/index.ts
import { plainToInstance } from 'class-transformer';
import { validate as classValidate, ValidationError as CVError } from 'class-validator';
import { ValidationError } from '../../common/errors';

export async function validate<T extends object>(
  dtoClass: new () => T,
  data: unknown,
): Promise<T> {
  const instance = plainToInstance(dtoClass, data);
  const errors = await classValidate(instance, {
    whitelist: true,           // 移除未定義的屬性
    forbidNonWhitelisted: true, // 禁止未定義的屬性
    stopAtFirstError: false,
  });

  if (errors.length > 0) {
    const details = formatValidationErrors(errors);
    throw new ValidationError(
      'VALIDATION_ERROR',
      '請求資料驗證失敗',
      details,
    );
  }

  return instance;
}

function formatValidationErrors(errors: CVError[]): object[] {
  return errors.map((error) => ({
    field: error.property,
    messages: Object.values(error.constraints || {}),
  }));
}
```

---

## 7. API 版本控制

### 7.1 URL 版本控制

```typescript
// src/api/routes/index.ts
import { Router } from 'express';
import v1Routes from './v1';
import v2Routes from './v2';

const router = Router();

router.use('/api/v1', v1Routes);
router.use('/api/v2', v2Routes);

export default router;
```

### 7.2 標頭版本控制

```typescript
// src/api/middlewares/api-version.middleware.ts
import { Request, Response, NextFunction } from 'express';

export function apiVersionMiddleware(req: Request, res: Response, next: NextFunction) {
  // 從 Accept 標頭獲取版本
  const acceptHeader = req.headers.accept;
  const versionMatch = acceptHeader?.match(/application\/vnd\.api\.v(\d+)\+json/);
  
  if (versionMatch) {
    req.apiVersion = parseInt(versionMatch[1], 10);
  } else {
    req.apiVersion = 1; // 預設版本
  }

  next();
}
```

---

## 8. 效能優化

### 8.1 快取策略

```typescript
// src/infrastructure/cache/cache.service.ts
import Redis from 'ioredis';

export class CacheService {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.redis.setex(key, ttl, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // Cache-Aside 模式
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttl);
    return value;
  }
}
```

### 8.2 資料庫查詢優化

```typescript
// 使用 select 選擇需要的欄位
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
    // 不選擇 password 等敏感欄位
  },
});

// 使用 include 進行關聯查詢，避免 N+1
const orders = await prisma.order.findMany({
  include: {
    user: { select: { id: true, name: true } },
    items: {
      include: {
        product: { select: { id: true, name: true, price: true } },
      },
    },
  },
});

// 批次操作
await prisma.$transaction([
  prisma.user.update({ where: { id: userId }, data: { status: 'active' } }),
  prisma.auditLog.create({ data: { userId, action: 'ACTIVATE' } }),
]);
```

---

## 輸出模板

```markdown
# [服務名稱] Backend Service 設計文件

## 1. 服務概述
- **服務名稱**: [service-name]
- **描述**: [服務功能描述]
- **負責團隊**: [團隊名稱]

## 2. API 端點清單

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/[resource] | 取得列表 | ✓ |
| POST | /api/v1/[resource] | 創建資源 | ✓ |

## 3. 資料模型

### 3.1 Entity
[資料庫 Entity 定義]

### 3.2 DTO
[Request/Response DTO]

## 4. 依賴服務
- [列出依賴的內部/外部服務]

## 5. 非功能需求
- **效能**: [TPS、回應時間要求]
- **可用性**: [SLA 目標]
- **安全**: [認證、授權方式]
```

---

## 常見問題

### Q1: 如何處理長時間運行的操作？
使用非同步處理模式，透過 Message Queue (如 RabbitMQ, Redis Queue) 將任務放入佇列，並提供任務狀態查詢 API。

### Q2: 如何實作 API 限流？
使用 Redis 實作滑動視窗或令牌桶演算法，或使用現有套件如 `express-rate-limit`。

### Q3: 如何處理跨服務資料一致性？
使用 Saga 模式進行分散式事務管理，確保最終一致性。

---

## 檢查清單

### 設計階段
- [ ] API 規格已使用 OpenAPI 定義
- [ ] 資料模型符合正規化原則
- [ ] 非功能性需求已明確

### 實作階段
- [ ] 程式碼符合分層架構
- [ ] 輸入資料已驗證
- [ ] 錯誤處理已實作
- [ ] 日誌記錄完善
- [ ] 單元測試覆蓋率 > 80%

### 部署前
- [ ] 效能測試通過
- [ ] 安全掃描無高風險漏洞
- [ ] API 文件已更新
- [ ] 監控告警已設定

---

## 相關 Skills

- [coding-standards.md](./coding-standards.md) - 程式碼規範
- [git-workflow.md](./git-workflow.md) - Git 工作流程
- [code-review.md](./code-review.md) - 程式碼審查
- [database-migration.md](./database-migration.md) - 資料庫遷移
- [../04-architecture/data-model.md](../04-architecture/data-model.md) - 資料模型設計
- [../06-quality-assurance/unit-test.md](../06-quality-assurance/unit-test.md) - 單元測試
