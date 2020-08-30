//global vars
var admin_url = '';
var current_url = '';

$(function() {

	$(document).ready(function(){
		// To open url in the same tab
		$('body').on('click', '.dashboard_urls', function(){
			var href = $(this).attr("href");
		    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		        var tab = tabs[0];
		        chrome.tabs.update(tab.id, {url: href});
		    });
		});
	})
    
    // Save URL in the storage.
    $("#save_link").click(function(){
		clear_error();

		var url_title 	= $("#url_title").val();
		var part_url 	= $("#part_url").val();

		// validation starts
		if($.trim(url_title) == "" || $.trim(part_url) == "") {
			show_error("All fields are required!");
			return false;
		}

		chrome.storage.local.get(['admin_urls'], function(result) {
			
			var new_values = '';

			var new_item 		= new Array();
			new_item[url_title] = part_url;

			if("" == result.admin_urls) {
				new_values = new_item;
			} else {
				// Merge new value with old one.
				new_values = $.extend(result.admin_urls, new_item);
			}

			chrome.storage.local.set({'admin_urls': new_values}, function() {
	        });

	        $("#url_title").val('');
	        $("#part_url").val('');

			render_html_links();
        });
    });
	
	// Trigger to remove URL from the storage
	$("#quick_links").on("click", ".remove_url", function(){
		var title = $(this).attr('data-title_key');
		remove_url(title);
		$(this).closest('tr').hide();
	});

	// Show add new url form.
	$(".add-new").click(function(){
		$(".add-new-target").hide();
		var target = $(this).attr("data-target");
		
		if("add-new-url" == target) {
			chrome.tabs.getSelected(null, function(tab) {
				
				$("#part_url").val(tab.url.replace(admin_url, ""));

				// Following JUGAD because I was unable perform operation on a special character '‹'.
				var title 	= encodeURI(tab.title);
				title 		= title.replace('%20%E2%80%B9%20', 'callme');
				title 		= decodeURI(title);

				$("#url_title").val(title.substr(0, title.indexOf('callme')));

			});
		}

		$("."+target).show();
	});


	// Save domain in the storage.
    $("#save_domain").click(function(){
		clear_error();
		var domain 	= $("#domain").val();

		// validation
		if($.trim(domain) == "") {
			show_error("All fields are required!");
			return false;
		}
		chrome.storage.local.get(['domains'], function(result) {
	
			// If domain does not end with '/', append it.
			if (domain.substring(domain.length-1) != "/") {
				domain = domain + '/';
			}
			
			var new_values 		= '';
			var new_item 		= new Array();
			new_item[domain] 	= 1;

			if("" == result.domains) {
				new_values = new_item;
			} else {
				// Merge new value with old one.
				new_values = $.extend(result.domains, new_item);
			}

			chrome.storage.local.set({'domains': new_values}, function() {
	        });

	        $("#domain").val('');
        });
	});


});

// Removes URL from the storage
function remove_url(title) {
	chrome.storage.local.get(['admin_urls'], function(result) {
		delete result.admin_urls[title];
		chrome.storage.local.set({'admin_urls': result.admin_urls}, function() {
	    });
	});
}

// To show any error msg
function show_error(msg) {
	$("#error").html(msg);
}

// To clear error msgs
function clear_error() {
	$("#error").html("");
}

// Gets a base URL. That is link to WP dashboard.
function get_base_url(full_url) {

	// We are finding last occurence because, WP can be installed in sub-directory named 'wp-admin'.
	$index_of_last = full_url.lastIndexOf("/wp-admin/");

	if(-1 == $index_of_last) {
		return false;
	}
	
	return full_url.substr(0, $index_of_last);
}

// Runs when we click on app icon.
chrome.tabs.query({active: true, currentWindow: true}, function(arrayOfTabs) {
	var activeTab = arrayOfTabs[0];
	current_url = activeTab.url;
	var base_url = get_base_url(activeTab.url);
	if(base_url) {
		admin_url = base_url + '/wp-admin/'; // Sets value in global variable
	}
	render_html_links();
});


// We validate here for admin URL. If admin URL is present then request to generate HTML otherwise we will search in saved domains for admin URL.
function render_html_links() {
	if(!admin_url) {
		chrome.storage.local.get(['domains'], function(result) {
			var counter = 0;
			if("undefined" != result.domains && "" != result.domains) {
				chrome.tabs.getSelected(null, function(tab) {
					$.each(result.domains, function(domain, nothing) {
						if(tab.url.indexOf(domain) >= 0) {
							admin_url = domain + 'wp-admin/';
							counter++;
							render_html_links_with_url();
						}
					});
					// This is due to async execution.
					if(0 == counter) {
						render_html_links_with_url();
					}
				});
			} else {
				render_html_links_with_url();
			}
		});
	} else {
		render_html_links_with_url();
	}
}

// This is the only function which generates HTML for links.
function render_html_links_with_url() {
	// admin_url is a global variable here
	if(admin_url) {
		$("#new_domain_btn").hide();

		chrome.storage.local.get(['admin_urls'], function(result) {

			if("undefined" == typeof result.admin_urls || "" == result.admin_urls) {
				show_error("Please add a URL.");
			} else {
				var html = '';
				var char = '';

				$.each(result.admin_urls, function(title, partial_url){
					if(title.toUpperCase().charAt(0) != char) {
						char = title.toUpperCase().charAt(0);
						html += `<tr><td colspan="2"><h5 class="separator"><span>${char}</span></h5></td></tr>`;
					}
					html += '<tr><td><a class="dashboard_urls" href="'+admin_url+partial_url+'" title="'+admin_url+partial_url+'">'+title+'</a></td>'
					+'<td><span data-title_key="'+title+'" title="Remove URL" class="remove_url">X</span></tr>';
				});
				
				$("#quick_links").html(html);

				// var hrefs = document.getElementsByClassName("dashboard_urls");
			}
		});
	} else {
		$("#current_url").val(current_url);
		show_error("Either this is non WP site or You are on the frontend. If this is a WP site and you want to access URLs from the frontend, save base URL using 'add new domain'.");
	}
}

