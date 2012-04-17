/* Author: 

*/
var dataSources = {
	'sources': [],
	'listSeries': function(type) {
			var series = [];
			$.each(this.sources, function(index, source) {
				series.push({'name': source.name, 'data': source.makeSeries(type)});
			});
			return series;
		}
}
function graphData() {
	this.label = '';
	this.query = '';
        this.api_query = '';
        this.web_query = '';
	this.data = {};
        this.interval = '';
        this.country = '';
	this.getYears = function() {
		var years = [];
		$.each(this.data, function(year, value) {
			years.push(year);
		});
		years.sort();
		return years;
	}
	this.makeSeries = function(type) {
		//years = this.getYears();
		var series = [];
		//var self = this;
                if (this.interval == "year") {
                    $.each(this.data, function(year, values) {
                        series.push([Date.UTC(parseInt(year, 10), 0, 1), values[type]]);
                    });
                } else if (this.interval == "month") {
                    $.each(this.data, function(year, values) {
                        $.each(values, function(month, totals) {
                            series.push([Date.UTC(parseInt(year, 10), parseInt(month, 10)-1, 1), totals[type]]);
                        });       
                    });
                }
		//$.each(years, function(index, year) {
		//	series.push([parseInt(year), self.data[year][type]]);
		//});
		return series;
	}
	this.getTotal = function(year, month) {
	    if (month > 0) {
		return this.data[year.toString()][month.toString()]['total'];
            } else {
                return this.data[year.toString()]['total'];
            }
	}
        this.getRatio = function(year, month) {
	    if (month > 0) {
		return this.data[year.toString()][month.toString()]['ratio'];
            } else {
                return this.data[year.toString()]['ratio'];
            }
	}
}
$(function(){
    reset();
    var digitalnz_api_key = "9yXNTynMDb3TUQws7QuD";
    var digitalnz_api_url = "http://api.digitalnz.org/records/v2.json?";
    var digitalnz_html_url = "http://digitalnz.org.nz/records?i[display_collection]=Papers+Past";
    var trove_api_key = "6pi5hht0d2umqcro";
    var trove_api_url = "http://api.trove.nla.gov.au/result?zone=newspaper";
    var trove_html_url = "http://trove.nla.gov.au/newspaper/result?q="
    var twitter_url ="//platform.twitter.com/widgets/tweet_button.html";
    var query = {};
    var decade_start = 180;
    var decade_end = 195;
    var decade_current = decade_start;
    queries = [];
    var query_type = 'ratio';
    
    function get_query() {
        if ($("#query").val() != "") {
            queries.push($("#query").val() + "|" + $("#country").val());
        } else if (window.location.href.match(/\?q=.+/)) {
            queries = window.location.href.split(/\?q=|&q=/);
            queries.shift();
        }
        setup_query();
    }
    function api_request() {
        var this_query = query[query_type];
        if (query["country"] == "Aus") {
            $("#status").html("<p>Retrieving data for the " + decade_current + "0s...</p>");
            this_query = this_query + "&l-decade=" + decade_current;
            if (query_type == "ratio") {
                this_query = this_query + "&q=date:[" + decade_current + "0 TO " + decade_current + "9]"
            }
            var callback = "callback";
        } else if (query["country"] == "NZ") {
             $("#status").html("<p>Retrieving data...</p>"); 
            var callback = "jsonp";
        }
        $.ajax({
            "dataType": "jsonp",
            "jsonp": callback,
            "url": this_query,
            "success": function(results) {
                process_results(results);
            },
            error: function(xmlReq, txtStatus, errThrown){
                $("#graph").hideLoading();
                $('#status').text(xmlReq.responseText);
            }
        });
   }
        
    function process_results(results) {
        if (query["country"] == "Aus") {
            process_trove_results(results);
        } else if (query["country"] == "NZ") {
            process_digitalnz_results(results);
        }
        if (query_type == "ratio") {
            query_type = "total";
            api_request();
        } else if (query_type == "total") {
            query_type = "ratio";
            if (query["country"] == "Aus" && decade_current < decade_end) {
                decade_current++;
                api_request();
            } else {
                dataSources.sources.push(current_series);
                $("#graph").hideLoading();
                setup_query();
            }
        }
   }
   
    function process_trove_results(results) {
        if (query_type == "total") {
            if (parseInt(results.response.zone[0].records.total, 10) > 0) {
                $.each(results.response.zone[0].facets.facet.term, function(index, value) {
                    current_year = value.display;
                    current_series.data[current_year]['total'] = parseInt(value.count, 10);
                    var ratio = value.count / current_series.data[current_year]['all'];
                    current_series.data[current_year]['ratio'] = ratio;
                });
            }
        } else if (query_type == "ratio") {
            $.each(results.response.zone[0].facets.facet.term, function(index, value) {
                current_year = value.display;
                current_series.data[current_year] = {};
                current_series.data[current_year]['all'] = parseInt(value.count, 10);
                current_series.data[current_year]['total'] = 0;
                current_series.data[current_year]['ratio'] = 0;
            });
        }
    }
    
    function process_digitalnz_results(results) {
        var facets = results.facets[0].values;
        if (query_type == "total") {
            $.each(facets, function(index, value) {
                current_year = parseInt(value.name, 10);
                current_series.data[current_year]['total'] = value.num_results;
                var ratio = value.num_results / current_series.data[current_year]['all'];
                current_series.data[current_year]['ratio'] = ratio;
            });
        } else if (query_type == "ratio") {
            $.each(facets, function(index, value) {
                current_year = parseInt(value.name, 10);
                current_series.data[current_year] = {};
                current_series.data[current_year]['all'] = value.num_results;
                current_series.data[current_year]['total'] = 0;
                current_series.data[current_year]['ratio'] = 0;
            });
        }
   }
   
   function setup_query() {
        if (queries.length > 0) {
            if (dataSources.sources.length > 0) {
                makeChart('ratio');
            }
            $("#graph").show().showLoading();
            decade_current = decade_start;
            var query_parts = decodeURIComponent(queries.shift()).split('|')
            keywords = encodeURIComponent(query_parts[0])
            if (query_parts[1] == "aus") {
                query['total'] = trove_api_url + "&q=" + keywords + "&facet=year&n=0&encoding=json&key=" + trove_api_key;
                query['ratio'] = trove_api_url + "&facet=year&n=0&encoding=json&key=" + trove_api_key;
                var api_query = trove_api_url + "&q=" + keywords + "&n=20&encoding=json&key=" + trove_api_key;
                var web_query = trove_html_url + keywords;
                query['country'] = "Aus";
            } else if (query_parts[1] == "nz") {
                query['total'] = digitalnz_api_url + '&search_text=' + keywords + '+collection:"Papers+Past"&facets=year&facet_num_results=-1&num_results=0&api_key=' + digitalnz_api_key;
                query['ratio'] = digitalnz_api_url + '&search_text=collection:"Papers+Past"&facets=year&facet_num_results=-1&num_results=0&api_key=' + digitalnz_api_key;
                var api_query = digitalnz_api_url + '&num_results=20&api_key=' + digitalnz_api_key + '&search_text=' + keywords + '+collection:"Papers+Past"';
                var web_query = digitalnz_html_url + '&text=' + keywords;
                query['country'] = 'NZ';
            }
            current_series = new graphData();
            current_series.name = query_parts[0] + " (" + query['country'] + ")";
            current_series.query = keywords;
            current_series.api_query = api_query;
            current_series.web_query = web_query;
            current_series.interval = "year";
            current_series.country = query_parts[1];
            api_request(query['ratio']);
        } else if (dataSources.sources.length > 0) {
            makeChart('ratio');
            $('#clear_last').show();
            if (dataSources.sources.length > 1) {
                $('#clear_all').show();
            }
        }
   }
   function make_link() {
        var params = [];
        $.each(dataSources.sources, function(key, source) {
            params.push(source.query + "|" + source.country);
        });
        var link = "http://wraggelabs.com/shed/querypic/?q=" + params.join("&q=");
        return link;
   }
   function serialise_data() {
        series_name = "series" + series_data.length;
        $("#series_data").append("var" + series_name + " = new graphData();");
        $("#series_data").append(series_name + ".name = '" + current_series.name + "';");
        $("#series_data").append("series_data.push(" + series_name + ");");
   }
    var chart;

    function makeChart(type) {
        $("#status").empty();
        $("#intro-hints").hide();
        $("#graph-notes").show();
        $("#intro-notes").hide();
        $("#graph-hints").show();
        $("#trove-results").show();
        $("#type_selector").show();
        $('#graph_type').val(type);
        $("#query").val("");
        var link = make_link();
        $("#link").html("Share this: <a href='" + link + "'>" + link + "</a>");
        $("#twitter-frame").attr('src', twitter_url + "?url=" + encodeURIComponent(link) + "&text=" + encodeURIComponent("Made with QueryPicNZ") + "&hashtags=querypic");
        if (dataSources.sources[0].interval == "month") {
            x_date = "%b %Y";
            xLabel = "Month";
        } else {
            x_date = "%Y";
            xLabel = "Year";
        }
        if (type == "total") {
            yLabel = "Number of articles matching query";
        } else if (type == "ratio") {
            yLabel = "% of articles matching query"
        }
        chart = new Highcharts.Chart({
          chart: {
             renderTo: 'graph',
             type: 'spline',
             zoomType: 'x'
          },
          title: {
              text: 'Newspaper articles by date'
           },
           xAxis: {
                    title: {
                            text: xLabel
                    },
                    type: 'datetime',
                    labels: {
                        formatter: function() {
                            return Highcharts.dateFormat(x_date, this.value);
                        }
                    }
           },
           yAxis: {
              title: {
                    text: yLabel
                },
                labels: {
                    formatter: function() {
                        if (type == "ratio") {
                            return Highcharts.numberFormat(this.value * 100, 2, '.', '');
                        } else if (type == 'total') {
                            return this.value;
                        }
                    }
                },
              min: 0
           },
           tooltip: {
              formatter: function() {
                    year = new Date(this.x).getFullYear();
                    if (dataSources.sources[this.series.index].interval == "month") {
                        var interval = "month";
                        month = new Date(this.x).getMonth() + 1;
                        month_name = Highcharts.dateFormat("%b %Y", this.x);
                    } else {
                        var interval = "year;"
                        month = 0;
                    }
                    if (type == "total") {
                        displayValue = this.y + " articles (" + (dataSources.sources[this.series.index].getRatio(year, month) * 100).toPrecision(2) + "% )";
                    } else if (type == "ratio") {
                        displayValue = (this.y * 100).toPrecision(2) + "% (" + dataSources.sources[this.series.index].getTotal(year, month) + " articles)";
                    }
                    if (interval == "month") {
                        return '<b>'+ this.series.name +'</b><br/>'+ month_name + ': ' + displayValue;
                    } else {
                        return '<b>'+ this.series.name + '</b><br/>' + year +': ' + displayValue;
    
                    }
             }
           },
          series: dataSources.listSeries(type),
          plotOptions: {
               series: {
                  cursor: 'pointer',
                  point: {
                     events: {
                        click: function() {
                            date = new Date(this.x);
                            query_date = date.getFullYear();
                            if (dataSources.sources[this.series.index].interval == "month") {
                                month = date.getMonth() + 1;
                                if (month < 10) {
                                    query_date = query_date + "/0" + month;
                                } else {
                                    query_date = query_date + "/" + month;
                                }
                            }
                            showArticles(query_date, this.series);
                        }
                     }
                  }
               }
            }
        });
    }
    function showArticles(query_date, series) {
            $('#articles').empty().height('50px');           
            $('#articles').showLoading();
            var this_query = dataSources.sources[series.index].api_query;
            if (dataSources.sources[series.index].country == "aus") {
                this_query = this_query + "&l-year=" + query_date;
                var callback = "callback";
            } else if (dataSources.sources[series.index].country == "nz") {
                this_query = this_query + "+year:" + query_date
                var callback = "jsonp";
            }
            $.ajax({
                    "dataType": "jsonp",
                    "jsonp": callback,
                    "url": this_query,
                    "success": function(results) {
                            $('#articles').height('');
                            $('#articles').append('<h3>Articles</h3>');
                            if (dataSources.sources[series.index].country == "aus") {
                                show_trove_articles(results, query_date, series);
                            } else if (dataSources.sources[series.index].country == "nz") {
                                show_digitalnz_articles(results, query_date, series);
                            }
                            $('#articles').hideLoading();
                    }
            });
    }
    function show_trove_articles(results, query_date, series) {
        if (results.response.zone[0].records.article.length > 0) {
            var articles = $('<ul id="articles"></ul>');
            $.each(results.response.zone[0].records.article, function(key, article) {
                newspaper = article.title.value.match(/(.*?) \(/)[1];
                date = $.format.date(article.date + ' 00:00:00.000', 'd MMMM yyyy');
                articles.append('<li><a target="_blank" class="article" href="'+ article.troveUrl + '">' + article.heading + ' (' + newspaper + ', ' + date + ')</a></li>');
            });
            $('#articles').append(articles);
        }
        $('#articles').append('<div class="more"><p><a target="_blank" href="' + dataSources.sources[series.index].web_query + '&fromyyyy=' + query_date + '&toyyyy=' + query_date + '">&gt; View more in Trove</a></p></div>')

    }
    function show_digitalnz_articles(results, query_date, series) {
        if (results.results.length > 0) {
            var articles = $('<ul id="articles"></ul>');
            $.each(results.results, function(key, article) {
                    articles.append('<li><a target="_blank" class="article" href="'+ article.display_url + '">' + article.title + '</a></li>');
            });
            $('#articles').append(articles);
        } 
        $('#articles').append('<div class="more"><p><a target="_blank" href="' + dataSources.sources[series.index].web_query + '&i[year]=%5B' + query_date + '+TO+' + query_date + '%5D&">&gt; View more at DigitalNZ</a></p></div>')
    }
    function clear_last() {
        dataSources.sources.pop();
        if (dataSources.sources.length > 0) {
            makeChart($('#graph_type').val());
            if (dataSources.sources.length == 1) {
                $("#clear_all").hide();
            }
        } else {
            chart.destroy();
            reset();
        }   
        
    }
    function clear_all() {
        dataSources.sources = [];
        chart.destroy();
        reset();
    }
    function reset() {
        decade_current = decade_start;
        $("#graph").hide();
        $("#clear_last").hide();
        $("#clear_all").hide();
        $("#type_selector").hide();
        $("#trove-results").hide();
        $("#graph-hints").hide();
        $("#intro-hints").show();
        $("#intro-notes").show();
        $("#graph-notes").hide();
        $("#articles").empty();
    }
    $('#graph_type').change(function() {
       makeChart($('#graph_type').val()); 
    });
    $("#do_query").button().click(function(){ get_query(); });
    $('#query').keydown(function(event) {
        if (event.which == 13) {
            event.preventDefault();
            get_query();
        }
    });
    $("#clear_last").button().click(function(){ clear_last(); });
    $("#clear_all").button().click(function(){ clear_all(); });
    get_query();
});






















