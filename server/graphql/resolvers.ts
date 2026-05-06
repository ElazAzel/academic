import { env } from "@/lib/env";

export const graphqlResolvers = {
  Query: {
    me: async () => {
      throw new Error("GraphQL scaffold: implement me resolver after FEATURE_GRAPHQL is enabled.");
    },
    courses: async () => {
      throw new Error("GraphQL scaffold: use REST services from server/modules/courses.");
    }
  },
  Mutation: {
    createCourse: async () => {
      throw new Error("GraphQL scaffold: wire to createCourse use-case.");
    }
  }
};

export function assertGraphqlEnabled() {
  if (!env.FEATURE_GRAPHQL) {
    throw new Error("GraphQL is scaffolded. Set FEATURE_GRAPHQL=true after implementing a server runtime.");
  }
}

