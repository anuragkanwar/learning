---
sidebar_position: 1
title: "DataSource Configuration"
---

# DataSource Configuration

## What is a DataSource?

A `DataSource` is a factory for database connections. In production, you never create connections manually (`DriverManager.getConnection()`). Instead, you use a connection pool.

**Why Connection Pooling?**
- Opening a database connection is expensive (~100-200ms)
- Reusing connections improves performance dramatically
- HikariCP is the industry standard (fastest, most reliable)

---

## Configuring DataSource in Spring

### 1. application.properties

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mydb
    username: root
    password: secret
    driver-class-name: com.mysql.cj.jdbc.Driver
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
```

### 2. Programmatic Configuration

For dynamic configuration or externalizing credentials:

```java
@Configuration
public class DataSourceConfig {
    
    @Bean
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:mysql://localhost/mydb");
        config.setUsername("root");
        config.setPassword("secret");
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(5);
        return new HikariDataSource(config);
    }
}
```

---

## Connection Pool Properties Explained

| Property | Description | Default |
|----------|-------------|---------|
| `maximumPoolSize` | Max connections in pool | 10 |
| `minimumIdle` | Min idle connections maintained | 10 |
| `connectionTimeout` | Max wait for connection (ms) | 30000 (30s) |
| `idleTimeout` | Max idle time before eviction (ms) | 600000 (10m) |
| `maxLifetime` | Max connection lifetime (ms) | 1800000 (30m) |

:::tip Pool Sizing
Formula: `connections = ((core_count * 2) + effective_spindle_count)`
For a 4-core server with 1 disk: `((4 * 2) + 1) = 9` connections.
Don't set it to 100 "just to be safe" — it hurts performance.
:::

---

## Multiple DataSources

Sometimes you need to read from one DB and write to another:

```java
@Configuration
public class MultiDataSourceConfig {
    
    @Primary
    @Bean
    @ConfigurationProperties("spring.datasource.primary")
    public DataSource primaryDataSource() {
        return DataSourceBuilder.create().build();
    }
    
    @Bean
    @ConfigurationProperties("spring.datasource.secondary")
    public DataSource secondaryDataSource() {
        return DataSourceBuilder.create().build();
    }
}
```

```yaml
spring:
  datasource:
    primary:
      url: jdbc:mysql://primary-db/mydb
      username: user1
    secondary:
      url: jdbc:mysql://secondary-db/mydb
      username: user2
```
