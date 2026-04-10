module.exports = {
    branches: ["main"],
    plugins: [
        "@semantic-release/commit-analyzer",
        "@semantic-release/release-notes-generator",
        "@semantic-release/changelog",
        [
            "@semantic-release/npm",
            {
                npmPublish: false
            }
        ],
        [
            "@semantic-release/exec",
            {
                "prepareCmd": "sed -i -E 's/version \\\".*\\\"/version \\\"${nextRelease.version}\\\"/g' fxmanifest.lua && pnpm -C web version ${nextRelease.version} --no-git-tag-version && cd web && pnpm install && pnpm build && cd .. && zip -r mri_Qadmin.zip . -x \"web/node_modules/*\" \"web/src/*\" \"web/public/*\" \"web/tests/*\" \".git/*\" \".github/*\" \"node_modules/*\" \".vscode/*\" \"web/*.json\" \"web/*.config.js\" \"web/*.config.ts\" \".releaserc*\" \"release.config.cjs\" \"package-lock.json\""
            }
        ],
        [
            "@semantic-release/git",
            {
                assets: ["package.json", "web/package.json", "fxmanifest.lua", "CHANGELOG.md", "web/build/**"],
                message: "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
            }
        ],
        [
            "@semantic-release/github",
            {
                "assets": [
                    { "path": "mri_Qadmin.zip", "label": "mri_Qadmin v${nextRelease.version}.zip" }
                ]
            }
        ]
    ]
};
