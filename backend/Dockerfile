FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -B package
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd -r -u 10001 app
COPY --from=build /app/target/yeeyuan-api-0.1.0.jar app.jar
USER 10001
EXPOSE 8080
ENTRYPOINT ["java","-XX:MaxRAMPercentage=60","-jar","app.jar"]
