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
                "prepareCmd": "sed -i -E 's/version \\\".*\\\"/version \\\"${nextRelease.version}\\\"/g' fxmanifest.lua && sed -i -E 's/\\\"version\\\": \\\".*\\\"/\\\"version\\\": \\\"${nextRelease.version}\\\"/g' web/package.json"
            }
        ],
        [
            "@semantic-release/git",
            {
                assets: ["package.json", "fxmanifest.lua", "CHANGELOG.md"],
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
