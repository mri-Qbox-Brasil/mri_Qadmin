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
                "prepareCmd": "powershell -Command \"(Get-Content fxmanifest.lua) -replace 'version \\\".*?\\\"', 'version \\\"${nextRelease.version}\\\"' | Set-Content fxmanifest.lua; (Get-Content web/package.json) -replace '\"version\": \\\".*?\\\"', '\"version\": \\\"${nextRelease.version}\\\"' | Set-Content web/package.json\""
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
