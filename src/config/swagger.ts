// src/config/swagger.ts
import swaggerJsdoc from "swagger-jsdoc";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "WeTube API",
            version: "1.0.0",
            description: "교육용 동영상 플랫폼 API 명세서",
        },
        servers: [
            {
                url: "http://localhost:4000",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
                apiKeyAuth: {
                    type: "apiKey",
                    in: "header",
                    name: "x-client-key",
                },
            },
        },
        security: [
            {
                apiKeyAuth: [],
            },
        ],
    },
    apis: ["./src/routes/*.ts", "./src/docs/*.yaml"],
};

export const specs = swaggerJsdoc(options);
