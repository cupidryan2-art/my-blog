# frozen_string_literal: true
require 'tempfile'
require 'yaml'
require 'uri'
origin = ENV['QLOG_SITE_URL']
origin ||= "https://#{ENV['VERCEL_PROJECT_PRODUCTION_URL']}" if ENV['VERCEL_PROJECT_PRODUCTION_URL']
abort 'Set QLOG_SITE_URL (absolute production HTTPS origin) or VERCEL_PROJECT_PRODUCTION_URL; no domain will be guessed.' unless origin
uri = URI.parse(origin)
abort 'QLOG_SITE_URL must be an HTTPS origin without path/query/credentials' unless uri.scheme == 'https' && uri.host && ['', '/'].include?(uri.path) && !uri.query && !uri.fragment && !uri.userinfo
origin = origin.delete_suffix('/')
Tempfile.create(['qlog-vercel-', '.yml']) do |file|
  file.write({ 'url' => origin, 'baseurl' => '' }.to_yaml); file.flush
  args = ['bundle', 'exec', 'jekyll', 'build', '--config', "_config.yml,_config_vercel.yml,#{file.path}", '--disable-disk-cache', *ARGV]
  exit(system({ 'JEKYLL_ENV' => 'production' }, *args) ? 0 : 1)
end
