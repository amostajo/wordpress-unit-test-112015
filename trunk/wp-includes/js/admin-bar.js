(function(i,k){var c=function(n,m,d){if(n.addEventListener){n.addEventListener(m,d,false)}else{if(n.attachEvent){n.attachEvent("on"+m,function(){return d.call(n,window.event)})}}},e,f=new RegExp("\\bhover\\b","g"),a=[],j=new RegExp("\\bselected\\b","g"),g=function(m){var d=a.length;while(d--){if(a[d]&&m==a[d][1]){return a[d][0]}}return false},h=function(s){var n,d,q,m,p,r,u=[],o=0;while(s&&s!=e&&s!=i){if("LI"==s.nodeName.toUpperCase()){u[u.length]=s;d=g(s);if(d){clearTimeout(d)}s.className=s.className?(s.className.replace(f,"")+" hover"):"hover";m=s}s=s.parentNode}if(m){p=m.parentNode;if(p&&"UL"==p.nodeName.toUpperCase()){n=p.childNodes.length;while(n--){r=p.childNodes[n];if(r!=m){r.className=r.className?r.className.replace(j,""):""}}}}n=a.length;while(n--){q=false;o=u.length;while(o--){if(u[o]==a[n][1]){q=true}}if(!q){a[n][1].className=a[n][1].className?a[n][1].className.replace(f,""):""}}},l=function(d){while(d&&d!=e&&d!=i){if("LI"==d.nodeName.toUpperCase()){(function(m){var n=setTimeout(function(){m.className=m.className?m.className.replace(f,""):""},500);a[a.length]=[n,m]})(d)}d=d.parentNode}},b=function(p){var n,d,o,m=p.target||p.srcElement;while(true){if(!m||m==i||m==e){return}if(m.className&&-1!=m.className.indexOf("ab-get-shortlink")){break}m=m.parentNode}if(p.preventDefault){p.preventDefault()}p.returnValue=false;if(-1==m.className.indexOf("selected")){m.className+=" selected"}for(n=0,d=m.childNodes.length;n<d;n++){o=m.childNodes[n];if(o.className&&-1!=o.className.indexOf("shortlink-input")){o.focus();o.select();o.onblur=function(){m.className=m.className?m.className.replace(j,""):""};break}}return false};c(k,"load",function(){e=i.getElementById("wpadminbar");if(i.body&&e){i.body.appendChild(e);c(e,"mouseover",function(d){h(d.target||d.srcElement)});c(e,"mouseout",function(d){l(d.target||d.srcElement)});c(e,"click",b)}if(k.location.hash){k.scrollBy(0,-32)}})})(document,window);