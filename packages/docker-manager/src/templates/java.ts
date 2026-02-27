export function javaDockerfile(buildTool?: string, port?: number): string {
  const exposedPort = port || 8080;

  if (buildTool === "gradle") {
    return `FROM gradle:8-jdk21 AS builder
WORKDIR /app
COPY build.gradle* settings.gradle* gradle* ./
COPY gradle/ gradle/
RUN gradle dependencies --no-daemon 2>/dev/null || true
COPY . .
RUN gradle bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE ${exposedPort}
CMD ["java", "-jar", "app.jar"]`;
  }

  // Maven (default)
  return `FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY . .
RUN mvn package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE ${exposedPort}
CMD ["java", "-jar", "app.jar"]`;
}
