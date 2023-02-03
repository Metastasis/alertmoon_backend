// import { Namespace, SubjectSet, Context } from "@ory/keto-namespace-types"

class User implements Namespace {
  related: {
    manager: User[]
  }
}

class Group implements Namespace {
  related: {
    members: (User | Group)[]
  }
}

class NotificationPattern implements Namespace {
  related: {
    viewers: (User | SubjectSet<Group, "members">)[]
    owners: (User | SubjectSet<Group, "members">)[]
  }

  permits = {
    view: (ctx: Context): boolean =>
      this.related.viewers.includes(ctx.subject) ||
      this.related.owners.includes(ctx.subject),
    edit: (ctx: Context) => this.related.owners.includes(ctx.subject),
  }
}
