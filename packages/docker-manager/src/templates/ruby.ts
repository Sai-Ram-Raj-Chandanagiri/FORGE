export function rubyDockerfile(framework?: string, port?: number): string {
  const exposedPort = port || 3000;

  if (framework === "rails") {
    return `FROM ruby:3.3-slim
RUN apt-get update -qq && apt-get install -y build-essential libpq-dev nodejs
WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN bundle install --jobs 4 --retry 3
COPY . .
RUN bundle exec rails assets:precompile 2>/dev/null || true
EXPOSE ${exposedPort}
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0", "-p", "${exposedPort}"]`;
  }

  return `FROM ruby:3.3-slim
RUN apt-get update -qq && apt-get install -y build-essential
WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN bundle install --jobs 4 --retry 3
COPY . .
EXPOSE ${exposedPort}
CMD ["bundle", "exec", "ruby", "app.rb"]`;
}
