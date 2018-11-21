<?php
error_reporting(E_ERROR | E_PARSE);

// Recursive rmdir
function rrmdir($dir) { 
  if (is_dir($dir)) { 
    $objects = scandir($dir); 
    foreach ($objects as $object) { 
      if ($object != "." && $object != "..") { 
        if (is_dir($dir."/".$object))
          rrmdir($dir."/".$object);
        else
          unlink($dir."/".$object); 
      } 
    }
    rmdir($dir); 
  } 
}

// Dir contents to associative array
function dir_to_array($dir) {
	if (! is_dir($dir)) {
		// If the user supplies a wrong path we inform him.
		return null;
	}

	// Our PHP representation of the filesystem
	// for the supplied directory and its descendant.
	$data = [];

	foreach (new DirectoryIterator($dir) as $f) {
		if ($f->isDot()) {
			// Dot files like '.' and '..' must be skipped.
			continue;
		}

		$path = $f->getPathname();
		$name = $f->getFilename();

		if ($f->isFile()) {
			$data[] = [ 'file' => $name ];
		} else {
			// Process the content of the directory.
			$files = dir_to_array($path);

			$data[] = [ 'dir'  => $files,
				    'name' => $name ];
			// A directory has a 'name' attribute
			// to be able to retrieve its name.
			// In case it is not needed, just delete it.
		}
	}

	// Sorts files and directories if they are not on your system.
	\usort($data, function($a, $b) {
		$aa = isset($a['file']) ? $a['file'] : $a['name'];
		$bb = isset($b['file']) ? $b['file'] : $b['name'];

		return \strcmp($aa, $bb);
	});

	return $data;
}

// Dir contents to JSON
function dir_to_json($dir) {
	$data = dir_to_array($dir);
	$data = json_encode($data);

	return $data;
}

// All caps logging so it looks more l33t
echo('GENERATING GROUPED EMOJI SEQUENCE - [/fetcher/emoji.test.txt]' . PHP_EOL);

// Adapted from https://github.com/lcherone/emoji-parse
file_put_contents('emoji-test.txt', file_get_contents('http://unicode.org/Public/emoji/latest/emoji-test.txt'));
// break into blocks
$blocks = explode(PHP_EOL.PHP_EOL, file_get_contents('emoji-test.txt'));
// unset header
unset($blocks[0]);
$emoji = [];
foreach ($blocks as $chunk) {
  $top = explode(PHP_EOL, $chunk)[0];
  if (substr($top, 0, strlen('# group:')) == '# group:') {
    $group = trim(str_replace('# group:', '', $top));
  } elseif (substr($top, 0, strlen('# subgroup:')) == '# subgroup:') {
    $lines = explode(PHP_EOL, $chunk);
    unset($lines[0]);
      foreach ($lines as $line) {
        $subgroup = trim(str_replace('# subgroup:', '', $top));
        $linegroup = explode(';', $line);
        $parts = explode('#', $linegroup[1]);
        $icon = explode(' ', trim($parts[1]), 2);
        $emoji[$group][$subgroup][] = [
          'group' => trim($group),
          'subgroup' => $subgroup,
          'name' => trim($linegroup[0]),
          'status' => trim($parts[0]),
          'emoji' => trim($icon[0]),
          'description' => trim($icon[1]),
        ];
    }
  }
}

echo('DONE' . PHP_EOL);

// Fetch twemoji and put each into directories, as per the groups fetched from emoji-test.txt
//TODO: Detect git presence
if (!is_dir('twemoji')) {
  echo('RETRIEVING TWEMOJI FROM REPOSITORY - [/fetcher/twemoji] ' . PHP_EOL);
  shell_exec('git clone https://github.com/twitter/twemoji.git twemoji');
  echo('DONE.' . PHP_EOL);
}

echo('RESOLVING SEQUENCE TO AVAILABLE TWEMOJI - [/svg].' . PHP_EOL);

// Completely DESTROY the svg dir if it already exists - we're gonna override it anyway
if (is_dir('../svg')) {
  rrmdir('../svg');
}

mkdir('../svg');

// Suppress errors for file-not-found warnings, but do increment the counter so we know how many emoji weren't found.
$errorcount = 0;
set_error_handler(function($errno, $errstr) {
  $errorcount++;
}, E_WARNING);

foreach($emoji as $groupname => $group) {
  mkdir('../svg/' . $groupname);
	foreach($group as $subgroup) {
    foreach($subgroup as $glyph) {
      $filename = strtolower(str_replace(' ', '-', $glyph['name'])) . '.svg';
      copy('twemoji/2/svg/' . $filename, '../svg/' . $groupname . '/' . $filename);
    }
  }
}

restore_error_handler();

//rrmdir('twemoji');

if ($errorcount > 0) {
  echo('WARN: ' . $errorcount . ' EMOJI COULD NOT BE RESOLVED.' . PHP_EOL);
}
echo('DONE.' . PHP_EOL);

echo('GENERATING JSON INDEX FOR RESOLVED EMOJI - [/svgs.json]' . PHP_EOL);
file_put_contents("../svgs.json", dir_to_json("../svg"));
echo('DONE, EXITING.' . PHP_EOL);
?>