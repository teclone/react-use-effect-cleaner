module.exports = {
  repositoryUrl: 'https://github.com/teclone/react-use-effect-cleaner.git',
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    ['@semantic-release/github'],
    '@semantic-release/npm',
  ],
  ci: true,
};
