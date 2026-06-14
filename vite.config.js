import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import autoprefixer from 'autoprefixer';
import path from 'path';
import fs from 'fs';
import { parseEnv } from 'node:util';
import handlebars from 'handlebars';

const pages = {"4830ca1d-71c3-4253-bc8a-b38ba92a8ce5-en":{"outputDir":"./home_giocatore","lang":"en","title":"","cacheVersion":378,"meta":[{"name":"twitter:card","content":"summary"},{"property":"og:site_name","content":"ECHO"},{"property":"og:type","content":"website"},{"name":"robots","content":"noindex, nofollow"}],"scripts":{"head":"<style>\r\n.item-desc {\r\n  color: var(--ww-color-grey);\r\n  font-style: italic;\r\n}\r\n</style>\n","body":"\n"},"baseTag":{"href":"/","target":"_self"},"alternateLinks":[{"rel":"alternate","hreflang":"x-default","href":"https://0d25bfbe-237d-4ea6-b4d5-07ba2049d092.weweb-preview.io/home_giocatore/"},{"rel":"alternate","hreflang":"en","href":"https://0d25bfbe-237d-4ea6-b4d5-07ba2049d092.weweb-preview.io/home_giocatore/"}]},"016ac55d-8c7d-4172-8639-b3f702ac57bf-en":{"outputDir":"./account","lang":"en","title":"","cacheVersion":378,"meta":[{"name":"twitter:card","content":"summary"},{"property":"og:site_name","content":"ECHO"},{"property":"og:type","content":"website"},{"name":"robots","content":"index, follow"}],"scripts":{"head":"<style>\r\n.item-desc {\r\n  color: var(--ww-color-grey);\r\n  font-style: italic;\r\n}\r\n</style>\n","body":"\n"},"baseTag":{"href":"/","target":"_self"},"alternateLinks":[{"rel":"alternate","hreflang":"x-default","href":"https://0d25bfbe-237d-4ea6-b4d5-07ba2049d092.weweb-preview.io/account/"},{"rel":"alternate","hreflang":"en","href":"https://0d25bfbe-237d-4ea6-b4d5-07ba2049d092.weweb-preview.io/account/"}]},"90678483-cc41-4e53-bfa4-4af9c5ee89a6-en":{"outputDir":"./login","lang":"en","title":"","cacheVersion":378,"meta":[{"name":"twitter:card","content":"summary"},{"property":"og:site_name","content":"ECHO"},{"property":"og:type","content":"website"},{"name":"robots","content":"index, follow"}],"scripts":{"head":"<style>\r\n.item-desc {\r\n  color: var(--ww-color-grey);\r\n  font-style: italic;\r\n}\r\n</style>\n","body":"\n"},"baseTag":{"href":"/","target":"_self"},"alternateLinks":[{"rel":"alternate","hreflang":"x-default","href":"https://0d25bfbe-237d-4ea6-b4d5-07ba2049d092.weweb-preview.io/login/"},{"rel":"alternate","hreflang":"en","href":"https://0d25bfbe-237d-4ea6-b4d5-07ba2049d092.weweb-preview.io/login/"}]},"3d31f2c5-f8d6-4e76-9d15-3d7cdb2234f4-en":{"outputDir":"./schedapg","lang":"en","title":"","cacheVersion":378,"meta":[{"name":"twitter:card","content":"summary"},{"property":"og:site_name","content":"ECHO"},{"property":"og:type","content":"website"},{"name":"robots","content":"noindex, nofollow"}],"scripts":{"head":"<style>\r\n.item-desc {\r\n  color: var(--ww-color-grey);\r\n  font-style: italic;\r\n}\r\n</style>\n","body":"\n"},"baseTag":{"href":"/","target":"_self"},"alternateLinks":[{"rel":"alternate","hreflang":"x-default","href":"https://0d25bfbe-237d-4ea6-b4d5-07ba2049d092.weweb-preview.io/schedapg/"},{"rel":"alternate","hreflang":"en","href":"https://0d25bfbe-237d-4ea6-b4d5-07ba2049d092.weweb-preview.io/schedapg/"}]},"e29bd70c-d583-4ee3-ad2f-a8680e08c41a-en":{"outputDir":"./","lang":"en","title":"","cacheVersion":378,"meta":[{"name":"twitter:card","content":"summary"},{"property":"og:site_name","content":"ECHO"},{"property":"og:type","content":"website"},{"name":"robots","content":"noindex, nofollow"}],"scripts":{"head":"<style>\r\n.item-desc {\r\n  color: var(--ww-color-grey);\r\n  font-style: italic;\r\n}\r\n</style>\n","body":"\n"},"baseTag":{"href":"/","target":"_self"},"alternateLinks":[{"rel":"alternate","hreflang":"x-default","href":"https://0d25bfbe-237d-4ea6-b4d5-07ba2049d092.weweb-preview.io/"},{"rel":"alternate","hreflang":"en","href":"https://0d25bfbe-237d-4ea6-b4d5-07ba2049d092.weweb-preview.io/"}]}};

// Read the main HTML template
const template = fs.readFileSync(path.resolve(__dirname, 'template.html'), 'utf-8');
const compiledTemplate = handlebars.compile(template);

// Generate an HTML file for each page with its metadata
Object.values(pages).forEach(pageConfig => {
    // Compile the template with page metadata
    const html = compiledTemplate({
        title: pageConfig.title,
        lang: pageConfig.lang,
        meta: pageConfig.meta,
        structuredData: pageConfig.structuredData || null,
        scripts: {
            head: pageConfig.scripts.head,
            body: pageConfig.scripts.body,
        },
        alternateLinks: pageConfig.alternateLinks,
        cacheVersion: pageConfig.cacheVersion,
        baseTag: pageConfig.baseTag,
    });

    // Save output html for each page
    if (!fs.existsSync(pageConfig.outputDir)) {
        fs.mkdirSync(pageConfig.outputDir, { recursive: true });
    }
    fs.writeFileSync(`${pageConfig.outputDir}/index.html`, html);
});

const rolldownOptionsInput = {};
for (const pageName in pages) {
    rolldownOptionsInput[pageName] = path.resolve(__dirname, pages[pageName].outputDir, 'index.html');
}

function getFrontEnvironmentValues(root, mode) {
    const filePath = path.resolve(root, `.env.${mode}`);
    if (!fs.existsSync(filePath)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(parseEnv(fs.readFileSync(filePath, 'utf8'))).filter(([key]) => !key.startsWith('VITE_'))
    );
}

export default defineConfig(({ mode }) => {
    return {
        plugins: [vue()],
        base: "/",
        define: {
            global: 'globalThis',
            __VUE_PROD_DEVTOOLS__: mode === 'development',
            __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: mode === 'development',
            __WW_FRONT_ENV_VARIABLES__: JSON.stringify({
                staging: getFrontEnvironmentValues(__dirname, 'staging'),
                production: getFrontEnvironmentValues(__dirname, 'production'),
            }),
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        css: {
            preprocessorOptions: {
                scss: {
                    api: 'modern-compiler',
                },
            },
            postcss: {
                plugins: [autoprefixer],
            },
        },
        server: {
            port: 8080,
        },
        build: {
            chunkSizeWarningLimit: 10000,
            rolldownOptions: {
                input: rolldownOptionsInput,
                onwarn: (entry, next) => {
                    if (entry.loc?.file && /js$/.test(entry.loc.file) && /Use of eval in/.test(entry.message)) return;
                    if (/Use of direct `eval`/.test(entry.message)) return;
                    return next(entry);
                },
            },
        },
    };
});
