FROM denoland/deno:1.30.3

EXPOSE 3000

USER deno

WORKDIR /app

# Cache the dependencies as a layer.
# Also copy the config file, so the import maps are understood.
# https://deno.land/manual@v1.30.3/examples/manage_dependencies
COPY deps.ts deno.jsonc ./
RUN deno cache deps.ts

# Copy source files
COPY . .

# Compile the main app so that it doesn't need to be compiled each startup/entry.
RUN deno cache index.ts

# Start
CMD [ \
    "run",\
    "--allow-net=app.mealime.com,0.0.0.0:3000",\
    "--allow-env",\
    "--allow-read=/app",\
    "--allow-write=/app/cookiejar.json",\
    "index.ts"\
    ]