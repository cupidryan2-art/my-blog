# frozen_string_literal: true
require 'yaml'
require 'nokogiri'
require 'set'
rows = YAML.safe_load_file('_data/footprint.yml')
abort 'Footprint must be a nonempty array' unless rows.is_a?(Array) && !rows.empty?
ids = Set.new
rows.each do |row|
  abort 'Invalid or duplicate place ID' unless row.is_a?(Hash) && row['id'].is_a?(String) && row['id'].match?(/\A[a-z0-9-]+\z/) && ids.add?(row['id'])
  %w[name description].each { |key| abort "#{row['id']}: missing #{key}" unless row[key].is_a?(String) && !row[key].empty? }
  abort "#{row['id']}: invalid date/type" unless row['date'].is_a?(String) && row['date'].match?(/\A\d{4}-(0[1-9]|1[0-2])\z/) && %w[lived visited].include?(row['type'])
  abort "#{row['id']}: invalid coordinates" unless row['lat'].is_a?(Numeric) && (-90..90).cover?(row['lat']) && row['lng'].is_a?(Numeric) && (-180..180).cover?(row['lng'])
  abort "#{row['id']}: content must be array" unless row['content'].is_a?(Array)
  row['content'].each do |block|
    abort 'Invalid content block' unless block.is_a?(Hash)
    case block['type']
    when 'text' then abort 'Invalid text' unless block['value'].is_a?(String)
    when 'image'
      src = block['src']; abort 'Invalid/missing local image' unless src.is_a?(String) && src.start_with?('/assets/img/') && !src.include?('..') && File.file?(src.delete_prefix('/'))
      abort 'Invalid caption' if block.key?('caption') && !block['caption'].is_a?(String)
    else abort 'Unknown content type'
    end
  end
end
svg = Nokogiri::XML(File.read('_includes/world-map.svg'))
pins = svg.css('.fp-pin')
abort 'SVG IDs do not match YAML' unless pins.map { |p| p['data-id'] }.to_set == ids && pins.size == ids.size
pins.each do |pin|
  row = rows.find { |r| r['id'] == pin['data-id'] }
  %w[name date type].each { |key| abort "SVG #{row['id']} #{key} differs from YAML" unless pin["data-#{key}"] == row[key] }
end
puts "Validated #{rows.size} unique places, content blocks, images and SVG markers."
