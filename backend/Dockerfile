FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S spring && adduser -S spring -G spring && \
    mkdir -p /app/storage/uploads && \
    chown -R spring:spring /app
USER spring:spring
COPY --from=build /app/target/*.jar app.jar
# Exam schedules, deadlines and timestamps are stored as local wall-clock time, so the JVM must run in the
# school's time zone. Without this the container runs in UTC and an exam scheduled for 07:00 WIB opens at 14:00.
# Override with the TZ environment variable (Asia/Makassar for WITA, Asia/Jayapura for WIT).
ENV TZ=Asia/Jakarta

EXPOSE 8080
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
