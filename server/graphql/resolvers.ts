import { env } from "@/lib/env";

export const graphqlResolvers = {
  Query: {
    me: async () => {
      throw new Error("GraphQL-заглушка: реализуйте resolver me перед включением FEATURE_GRAPHQL.");
    },
    courses: async () => {
      throw new Error("GraphQL-заглушка: используйте REST-сервисы из server/modules/courses.");
    }
  },
  Mutation: {
    createCourse: async () => {
      throw new Error("GraphQL-заглушка: подключите сценарий createCourse.");
    }
  }
};

export function assertGraphqlEnabled() {
  if (!env.FEATURE_GRAPHQL) {
    throw new Error("GraphQL находится в режиме заглушки. Включайте FEATURE_GRAPHQL только после реализации серверного runtime.");
  }
}
