/*
og_engine.js

*/

/* Chapters */

var kOffsetChapterOrdinal = 0;
var kOffsetChapterTitle = 1;
var kOffsetChapterAuthor = 2;

// helper constant to sort out how the number of rows is calculated elsewhere in the engine
var kMaxChapterOffset = kOffsetChapterAuthor + 1;

// helper constants that act as a poor man's GET. JS has GET, but it is with AJAX
// and that is overkill here.
var kLetterSearchFlag = 'lettersearch';
var kChapterSearchFlag = 'chaptersearch';
var kTermSearchFlag = 'termsearch';

var kURLDelimiter = '?';
var kParamDelimiter = '=';
var kSearchTermDelimiter = '&';

/* Terms */

var kOffsetChapter = 0;
var kOffsetTerm = 1;
var kOffsetDefinition = 2;

// helper constant to sort out how the number of rows is calculated elsewhere in the engine
var kMaxTermOffset = kOffsetDefinition + 1;

var kAsciiUcMin = 65;
var kAsciiUcMax = 90;
var kAsciiLcMin = 97;
var kAsciiLcMax = 122;

/* HASH STACK */

var termIndexHash = new Array(27);
var chapterIndexHash = {};

/*
The hash is used for content retrieval and is generated at page load.

indexHash[27] // 0-25 = a-z , 26 = numbers & special chars

	0: a = {0, 1, 2}
	1: b = {3}
	2: c = {}
	3: d = {4, 5}

*/


/*
Takes the content array, examines the terms, and records the index in the appropriate hash Index

*/
function populateTermIndexHash() {

	// prep the chapter hash

	// chapter numbers can be non-sequential and sometimes a letter as opposed to a Number
	// so we use a plain object to store indexes as key-value.
	for ( var thisChapter = 0, lastChapter = ( chapterContent.length / kMaxChapterOffset ) ; thisChapter < lastChapter ; thisChapter += kMaxChapterOffset ) {
		chapterIndexHash[ chapterContent[ thisChapter + kOffsetChapterOrdinal ] ] = [];
	}

	for ( var i = 0, lastIdx = termIndexHash.length ; i < lastIdx ; i++ ) {
		termIndexHash[i] = [];
	}

	// iterate through the core content and sort into hashes
	// we want to record the index of the beginning of the "row" and not the term datum itself

	for ( var thisRow = 0 , lastRow = termContent.length / kMaxTermOffset; thisRow < lastRow ; thisRow++ ) {

		// record the index into the first letter's slot
		var asciiVal = termContent[ ( thisRow * kMaxTermOffset ) + kOffsetTerm ].charCodeAt(0);

		if ( asciiVal >= kAsciiUcMin && asciiVal <= kAsciiUcMax ) {
			termIndexHash[ asciiVal - kAsciiUcMin ].push( thisRow );
		} else if ( asciiVal >= kAsciiLcMin && asciiVal <= kAsciiLcMax ) {
			termIndexHash[ asciiVal - kAsciiLcMin ].push( thisRow );
		} else {
			termIndexHash[26].push( thisRow );
		}

		// record the index into the chapter's slot

		// gracefully handle chapter data that falls outside of the chapter list. It can happen.
		if ( chapterIndexHash[ termContent[ ( thisRow * kMaxTermOffset ) + kOffsetChapter ] ] == undefined ) {
			chapterIndexHash[ termContent[ ( thisRow * kMaxTermOffset ) + kOffsetChapter ] ] = [];
		}

		chapterIndexHash[ termContent[ ( thisRow * kMaxTermOffset ) + kOffsetChapter ] ].push( thisRow );

	}
}

/* Content retrieval stack */

/*
Returns an HTML string populated with links for the used letters
*/
function createAlphaList() {

	var t = '<p>';
	for ( var i = 0, lastIdx = termIndexHash.length ; i < lastIdx ; i++ ) {

		var entry;

		if ( i < lastIdx - 1 ) {
			entry = String.fromCharCode( i + kAsciiUcMin );
		} else {
			entry = '#';
		}

		if ( termIndexHash[i].length > 0 ) {
			t += '<a href="glossary.html' + kURLDelimiter + kLetterSearchFlag + kParamDelimiter + entry + '">' + entry + '</a>';
		} else {
			t += entry;
		}

		if ( i < ( lastIdx - 1 ) ) {
			t += ' | ';
		}
	}

	t += '</p>';

	return t;
}

/* Navigation */


/*
Returns a string of HTML for a list with the complete chapter listing with links
*/

function createChapterLinkList() {

	/*
	<ul>
		<li><a href="chapter_01.html">Part n: Foo</a></li>
	</ul>
	*/

	var t = '<ul>';

	var lastChapter = chapterContent.length / kMaxChapterOffset;
	for ( var thisChapter = 0 ; thisChapter < lastChapter ; thisChapter++ ) {
		t = t + '<li><a href="glossary.html' + kURLDelimiter + kChapterSearchFlag + kParamDelimiter + getChapterContentAtIndexAndOffset( thisChapter , kOffsetChapterOrdinal ) + '">Chapter ' + getChapterContentAtIndexAndOffset( thisChapter , kOffsetChapterOrdinal ) + ': ' + getChapterContentAtIndexAndOffset( thisChapter , kOffsetChapterTitle ) + '</a></li>';
	}

	var t = t + '</ul>';

	return t;
}

/*
Returns a string of HTML for a pulldown meen with the complete chapter listing with links
*/

function createChapterLinkPullDownMenu() {

/*
document.write('<option value="chapter_01.html">Part n: Foo');
*/

var t = '<ul>';

	var lastChapter = chapterContent.length / kMaxChapterOffset;
	for ( var thisChapter = 0 ; thisChapter < lastChapter ; thisChapter++ ) {
		t = t + '<option value="glossary.html' + kURLDelimiter + kChapterSearchFlag + kParamDelimiter + getChapterContentAtIndexAndOffset( thisChapter , kOffsetChapterOrdinal ) + '">Chapter ' + getChapterContentAtIndexAndOffset( thisChapter , kOffsetChapterOrdinal ) + ': ' + getChapterContentAtIndexAndOffset( thisChapter , kOffsetChapterTitle );
	}

	var t = t + '</ul>';

	return t;

}

/*
 Chapter content getter. Accepts the "row" for the desired content, and the "column" in which
 it resides
 */

function getChapterContentAtIndexAndOffset( idx , offset ) {
	return chapterContent[ ( idx * kMaxChapterOffset ) + offset ];
}

/* SEARCH STACK: INDEX PAGE */

/*
Triggers the searching functionality. Accepts the search terms, generates a URL,
then moves the browser forward. Actual searching is triggered once the new
window loads
*/
function prepSearch( terms ) {

	// catch the obvious errors

	if ( !termsAreSearchable( terms ) ) {
		return;
	}

	// sanitize terms
	var sanitizedTerms = sanitizeSearchTerms( terms );

	// create a URL for the search so the user can use it later
	window.location.href = 'glossary.html' + kURLDelimiter + kTermSearchFlag + kParamDelimiter + sanitizedTerms;

	// at this point, actual searching is triggered by the search results window
}

/*
PRIVATE
Helper method that checks the validity of the entry for alphanumeric characters. Returns false
when it finds no alphanumerics of any kind. So, spaces, punctuation, and the like, and only
those in the string are
*/

function termsAreSearchable ( terms ) {

	// check for the simp

	// check for an accidental click on the search button
	if ( terms == null || terms == '' ) {
		 return false;
	}

	// a lot of other things can happen at this point, so we check to see if alphanumerics
	// are at least present.

	var alphaNumericRegExp = /([a-zA-Z0-9]+)$/;
	if ( alphaNumericRegExp.test( terms ) == false)
	{
		return false;
	}

	return true;
}

/*
PRIVATE
Returns a URL-ready version of the search terms. Remove any common words not relevant
to any chapter content
*/

// helper array to remove common terms that can pollute search results from /usr/share/dict/
var connectives = new Array(
'a', 'about', 'after', 'against', 'all', 'also', 'an', 'and', 'another', 'any', 'are',
'as', 'at', 'back', 'be', 'because', 'been', 'before', 'being', 'between', 'both', 'but',
'by', 'came', 'can', 'come', 'could', 'day', 'did', 'do', 'down', 'each', 'even', 'first',
'for', 'from', 'get', 'go', 'good', 'great', 'had', 'has', 'have', 'he', 'her', 'here',
'him', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'just', 'know', 'last',
'life', 'like', 'little', 'long', 'made', 'make', 'man', 'many', 'may', 'me', 'men',
'might', 'more', 'most', 'mr', 'much', 'must', 'my', 'never', 'new', 'no', 'not', 'now',
'of', 'off', 'old', 'on', 'one', 'only', 'or', 'other', 'our', 'out', 'over', 'own',
'people', 'right', 'said', 'same', 'see', 'she', 'should', 'since', 'so', 'some', 'state',
'still', 'such', 'take', 'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these',
'they', 'this', 'those', 'three', 'through', 'time', 'to', 'too', 'two', 'under', 'up',
'us', 'used', 'very', 'was', 'way', 'we', 'well', 'were', 'what', 'when', 'where',
'which', 'while', 'who', 'will', 'with', 'work', 'world', 'would', 'year', 'years', 'you',
'your'
);

function sanitizeSearchTerms( terms ) {

	var cleanWords = [];

	// get rid of the connectives
	for ( var thisCon = 0, lastCon = connectives.length ; thisCon < lastCon ; thisCon++ ) {
		// we are looking for a whole word here, so we add spaces around the term
		terms = terms.split( ' ' + connectives[thisCon] + ' ' ).join( ' ' );
	}

	// split the text to get the individual search terms
	var rawWords = terms.split( ' ' );
	// for each raw word
	//     remove all non-alphanumerics
	for ( var i = 0, lastWord = rawWords.length ; i < lastWord ; i++ ) {
		var rawWord = rawWords[i];
		// this tackles common yet specific punctuation
		var cleanWord = rawWord.replace( /[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g , "" );

		cleanWords.push( cleanWord );
	}
	// combine into URL-ready string: var url = myData.join('&');
	return cleanWords.join( '&' );
}

/* SEARCH STACK: GLOSSARY PAGE */

/*
parses the terms in the given URL. Returns HTML tables with results
*/
function searchWithResults( searchURL ) {

	// get the type of query: letter, chapter, search
	var searchParams = getSearchParamsFromURL( searchURL );

	var rx = new RegExp(kLetterSearchFlag);
	if ( rx.test( searchParams[0] ) ) {
		var html = runLetterSearch( searchParams[1] );
		return html;
	}

	rx = new RegExp(kChapterSearchFlag);
	if ( rx.test( searchParams[0] ) )  {
		return runChapterSearch( searchParams[1] );
	}

	rx = new RegExp(kTermSearchFlag);
	if ( rx.test( searchParams[0] ) )  {
		return runTermSearch( searchParams[1] );
	}

	return '<p>No terms found.</p>';

}

function getSearchParamsFromURL( tURL ) {
	var theHREF = document.location.href;
	var delimiterIndex = theHREF.indexOf('?'); // get the location of the delimiter to sort out the index location
	var searchParams = theHREF.substring(delimiterIndex + 1, theHREF.length);
	var searchParamsDelimiterIndex = searchParams.indexOf('=');
	return new Array( searchParams.substring( 0, searchParamsDelimiterIndex ), searchParams.substring( searchParamsDelimiterIndex + 1, searchParams.length ) )
}

/*
PRIVATE

returns the HTML for the terms associated with the passed parameter
*/
function runLetterSearch( letter ) {

	// convert the letter to ascii

	var asciiVal = letter.charCodeAt(0);

	// convert the ascii to a term hash index

	if ( asciiVal >= kAsciiUcMin && asciiVal <= kAsciiUcMax ) {
		asciiVal -= kAsciiUcMin;
	} else if ( asciiVal >= kAsciiLcMin && asciiVal <= kAsciiLcMax ) {
		asciiVal -= kAsciiLcMin;
	} else {
		asciiVal = 26;
	}

	// get the values at the term hash index

	var indexes = termIndexHash[asciiVal];

	// make the table

	if ( indexes.length == 0 ) {
		return '<p>No terms found for that letter.</p>';
	}

	var html = makeResultsTable( indexes );
	return html;
}

/*
PRIVATE

returns the HTML for the terms associated with the passed parameter
*/
function runChapterSearch( chapter ) {

	// get the values at the chapter hash index

	var indexes = chapterIndexHash[chapter];

	// make the table

	if ( indexes.length == 0 ) {
		return '<p>No terms found for that chapter.</p>';
	}

	return makeResultsTable( indexes );
}

/*
PRIVATE

returns the HTML for the terms associated with the passed parameter
*/
function runTermSearch( terms ) {

	// convert the string into an array
	var searchTerms = terms.split( '&' );
	var lastSearchTerm = searchTerms.length;
	var resultRows = [];

	// for each term
	// get the rows with the titles in the title and caption
	// pile everything into a single list

	for ( var thisSearchTerm = 0 ; thisSearchTerm < lastSearchTerm ; thisSearchTerm++ ) {
		resultRows = resultRows.concat( searchDataPointWithTerm( kOffsetTerm, searchTerms[thisSearchTerm] ) );
		resultRows = resultRows.concat( searchDataPointWithTerm( kOffsetDefinition, searchTerms[thisSearchTerm] ) );
	}

	if ( resultRows.length == 0 ) {
		return '<p>No results found.</p>';
	}

	// remove the dupes
	resultRows = removeDuplicateValuesFromArray( resultRows );

	// indexes are returned as strings, so we need to convert them back to integers

	for ( var thisRow = 0, lastRow = resultRows.length ; thisRow < lastRow ; thisRow++ ) {
		resultRows[thisRow] = parseInt(resultRows[thisRow]);
	}

	// for each index, build the results HTML table and return

	var html = makeResultsTable( resultRows );

	return html;
}

/*
PRIVATE
returns the HTML for the terms given an array of terms indexes
*/
function makeResultsTable( indexes ) {

	var t = '<!-- GLOSSARY START -->\n';
	t += '<table class="glossaryTable">\n<tr>\n';
	t += '<th class="termHeader">Term</th>\n';
	t += '<th class="definitionHeader">Definition</th></tr>';

	var results = new Array();

	for ( var thisIdx = 0, lastIdx = indexes.length ; thisIdx < lastIdx ; thisIdx++ ) {

		if ( ( indexes[thisIdx] != undefined ) || ( indexes[thisIdx] > termContent.length ) ) {

			// term definition pair
			results.push( '<tr valign="top"><td class="termCell">' + termContent[ ( indexes[thisIdx] * kMaxTermOffset ) + kOffsetTerm ] + '</td><td class="definitionCell">' + termContent[ ( indexes[thisIdx] * kMaxTermOffset ) + kOffsetDefinition ] + '</td>' + '</tr>' );
		}
	}

	//results.sort();
	results = mergeSortStrings( results );
	t += results.join('');
	t += '</table>\n<!-- GLOSSARY END -->\n';

	return t;
}


/*
PRIVATE
Core function that checks a single data point for a single term
*/
function searchDataPointWithTerm( dataOffset , searchTerm ) {

	var matchingRows = [];

	// use regex to get case-insensitive partials
	var regex = new RegExp( searchTerm, 'gi');

	for ( var thisRow = 0 , lastRow = termContent.length / kMaxTermOffset; thisRow < lastRow ; thisRow++ ) {
		if ( termContent[ ( thisRow * kMaxTermOffset ) + dataOffset ].search( regex ) > -1 ) {
			matchingRows.push( thisRow );
		}
	}

	// return the array of indexes that contain that term
	return matchingRows;
}

/*
PRIVATE
returns an array of the search terms in the given URL
*/
function parseSearchURL( searchURL ) {
	var urlParts = searchURL.split( kURLDelimiter );
	return urlParts[1].split( kSearchTermDelimiter );
}

function parseMediaURL( mediaURL ) {
	var urlParts = mediaURL.split( kURLDelimiter );
	var paramParts = urlParts[1].split( kParamDelimiter );
	return new Array( paramParts[0], parseInt( paramParts[1] ) );
}

/*
PRIVATE
Merge sort
*/
function mergeSortStrings( arr )
{
    if (arr.length < 2)
        return arr;

    var middle = parseInt(arr.length / 2);
    var left   = arr.slice(0, middle);
    var right  = arr.slice(middle, arr.length);

    return mergeStrings(mergeSortStrings(left), mergeSortStrings(right));
}

function mergeStrings( left, right )
{
    var result = [];

    while (left.length && right.length) {

		var llc = left[0].toLowerCase();
		var rlc = right[0].toLowerCase();

		if ( llc.valueOf() <= rlc.valueOf() ) {
            result.push(left.shift());
        } else {
            result.push(right.shift());
        }
    }

    while (left.length)
        result.push(left.shift());

    while (right.length)
        result.push(right.shift());

    return result;
}


/*
PRIVATE
returns an array of only the unique items in an array
*/
function removeDuplicateValuesFromArray( arr ) {

	/*
	This utilizes the key-value functionality of Javascript objects by placing each item in
	the array as both the key and values. Since each key has to be unique, this is handled
	for us.
	*/
	var cacheObj = {};
	var lastItem = arr.length;
	for ( var i = 0 ; i < lastItem ; i++ ) {
		cacheObj[ arr[i] ] = arr[i];
	}
	// now that all of the keys have been populated, let's get them out
	var lastKey = cacheObj.length;
	var keys = [];
	for ( var key in cacheObj ) {
		keys.push( key );
	}
	return keys;
}
