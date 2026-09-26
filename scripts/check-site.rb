# frozen_string_literal: true
require 'nokogiri'
require 'pathname'
require 'uri'
require 'open3'
require 'set'

root = Pathname.new(ARGV.fetch(0)).expand_path
base = ARGV.fetch(1, '/my-blog')
origin = ARGV.fetch(2, 'https://cupidryan2-art.github.io')
scripts_only = ARGV.include?('--scripts-only')
errors = []
html = root.glob('**/*.html').to_h { |p| [p, Nokogiri::HTML(p.read)] }
html.each do |path, doc|
  label = path.relative_path_from(root)
  doc.css('script:not([src])').each_with_index do |script, i|
    next unless [nil, '', 'text/javascript', 'application/javascript', 'module'].include?(script['type'])
    args = ['node', '--check']
    args << '--input-type=module' if script['type'] == 'module'
    _, stderr, status = Open3.capture3(*args, stdin_data: script.text)
    errors << "#{label}: inline script #{i + 1}: #{stderr.lines.grep(/SyntaxError/).join.strip}" unless status.success?
  end
  next if scripts_only
  title = doc.at_css('title')&.text.to_s.strip
  errors << "#{label}: missing page title" if title.empty? || title.start_with?('|')
  canonical = doc.at_css('link[rel=canonical]')&.[]('href')
  errors << "#{label}: invalid canonical #{canonical.inspect}" unless canonical&.start_with?(origin + base + '/')
  doc.css('script[src], link[rel=stylesheet], img[src]').each do |element|
    value = element['src'] || element['href']
    next if value.nil? || value.match?(%r{\A(?:https?:|data:|//)})
    errors << "#{label}: missing base path #{value}" unless value.start_with?(base + '/')
    local = URI::DEFAULT_PARSER.unescape(value.split(/[?#]/).first).delete_prefix(base).delete_prefix('/')
    errors << "#{label}: missing asset #{value}" unless root.join(local).file?
  end
  doc.css('.share-bar a[href]').each do |a|
    next unless a['href'].match?(/twitter\.com|wa\.me|telegram\.me/)
    errors << "#{label}: relative share URL" unless URI::DEFAULT_PARSER.unescape(a['href']).include?(origin + base + '/posts/')
  end
  if doc.at_css('.qlog-post') && !doc.at_css('[data-comments-enabled]') && doc.css('script[src*=twikoo]').any?
    errors << "#{label}: unexpected comments in default-disabled post"
  end
end
unless scripts_only
  root.glob('assets/js/**/*.js').each do |path|
    _, stderr, status = Open3.capture3('node', '--check', path.to_s)
    errors << "#{path.basename}: #{stderr}" unless status.success?
  end
  sitemap = Nokogiri::XML(root.join('sitemap.xml').read)
  sitemap.xpath('//*[local-name()="loc"]').each do |node|
    errors << "sitemap: relative/wrong URL #{node.text}" unless node.text.start_with?(origin + base + '/')
  end
  %w[AGENTS.md TASK-footprint-map-v2.md README.md scripts .github .claude vercel.json].each do |name|
    errors << "private/development artifact published: #{name}" if root.join(name).exist?
  end
  first = html.fetch(root.join('index.html'))
  next_page = html[root.join('page2/index.html')]
  if next_page
    a = first.css('.post-card-link').map { |e| e['href'] }
    b = next_page.css('.post-card-link').map { |e| e['href'] }
    errors << 'pagination repeats posts' unless (a & b).empty?
    errors << 'missing next-page navigation' unless first.at_css('nav[aria-label="文章分页"] a[rel=next]')
    errors << 'missing previous-page navigation' unless next_page.at_css('nav[aria-label="文章分页"] a[rel=prev]')
  end
  %w[links footprint].each do |name|
    doc = html.fetch(root.join(name, 'index.html'))
    errors << "#{name}: expected one h1" unless doc.css('main h1').size == 1
  end
end
warn errors.join("\n") unless errors.empty?
puts "Checked #{html.size} HTML pages: #{errors.size} failure(s)."
exit(errors.empty? ? 0 : 1)
