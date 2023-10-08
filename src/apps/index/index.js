function getItemDescription(item) {
  let description = 
    item.getElementsByTagName("description")?.[0]?.textContent
    ?? item.getElementsByTagName("summary")?.[0]?.textContent
    ?? item.getElementsByTagName("content")?.[0]?.textContent
    ?? null;
  if (description) {
    const htmlDoc = (new DOMParser()).parseFromString(description, "text/html");
    // console.debug(htmlDoc.documentElement);
    // console.debug(htmlDoc.documentElement.innerText);
    // return htmlDoc.documentElement.innerText.replaceAll(/\n(\n| )*/g, "<br /><br />");
    return htmlDoc.documentElement.innerText.slice(0, 200)+"...";
  } else {
    return "";
  }
}

function fetchFeed(feed) {
  feed.status = "loading";
  return fetch(feed.url).then(response => {
    if (response.ok) {
      return response.text();
    } else {
      throw new Error(response.status);
    }
  }).then((xml) => {
    const xmlDoc = (new DOMParser()).parseFromString(xml, "text/xml");
    let parseerror = xmlDoc.querySelector("parsererror");
    let title;
    let items = [];
    if (null === parseerror) {
      if (xmlDoc.firstElementChild.nodeName === "feed") {
        // Atom format
        title = xmlDoc.querySelector("feed>title")?.textContent.trim() ?? "";
        xmlDoc.querySelectorAll("feed>entry").forEach((item) => {
          let description = getItemDescription(item);
          items.push({
            title: item.getElementsByTagName("title")?.[0]?.textContent.trim() ?? (description.slice(0, 60)+"..."),
            link: item.getElementsByTagName("link")?.[0]?.getAttribute("href") ?? "",
            description,
            date: item.getElementsByTagName("updated")?.[0]?.textContent.trim() ?? ""
          });
        });
      } else if (xmlDoc.firstElementChild.nodeName === "rss") {
        // RSS format
        title = xmlDoc.querySelector("rss>channel>title")?.textContent ?? "";
        xmlDoc.querySelectorAll("rss>channel>item").forEach((item) => {
          let description = getItemDescription(item);
          items.push({
            title: item.getElementsByTagName("title")?.[0]?.textContent.trim() ?? (description.slice(0, 60)+"..."),
            link: item.getElementsByTagName("link")?.[0]?.textContent.trim() ?? "",
            description,
            date: item.getElementsByTagName("pubDate")?.[0]?.textContent.trim() ?? ""
          });
        });
      } else {
        console.error("Missing <feed>/<rss> in XML document", xmlDoc);
        throw new Error(xmlDoc);
      }
    } else {
      console.error("parsererror", parseerror);
      throw new Error(parseerror);
    }

    Object.assign(feed, {title, items, status: "loaded"});
    return new Promise(resolve => resolve(feed));
  }).catch((e) => {
    console.warn("catch", e);
    Object.assign(feed, {status: "failed"});
    return new Promise(resolve => resolve(feed));
  });
}

PetiteVue.createApp({
  // urls: [
    // "http://localhost:8080/pandoc/reddit.rss",
    // "http://localhost:8080/pandoc/red-hat-enterprise-linux.rss",
    // "https://mastodon.social/@bagder.rss",
    // "http://localhost:8080/pandoc/bagder.rss",

    // "https://nitter.net/bagder/rss"
    // "https://www.youtube.com/feeds/videos.xml?channel_id=UC7noUdfWp-ukXUlAsJnSm-Q" // Red Hat Developers
    // https://www.nist.gov/blogs/taking-measure/rss.xml // NIST Blog
  // ],
  feeds: [
    {
      name: "The Kubernetes project blog",
      // url: "https://kubernetes.io/feed.xml",
      url: "https://rssproxy.migor.org/api/tf?url=https%3A%2F%2Fkubernetes.io%2Ffeed.xml&re=none&out=atom",
      status: "unloaded"
    },
    // {
    //   name: "Release notes from kubectl",
    //   // url: "https://github.com/kubernetes/kubectl/releases.atom",
    //   // url: "https://rssproxy.migor.org/api/tf?url=https%3A%2F%2Fgithub.com%2Fkubernetes%2Fkubectl%2Freleases.atom&re=none&out=atomhttps://github.com/kubernetes/kubectl/releases.atom",
    //   // url: "https://openrss.org/github.com/kubernetes/kubectl/releases.atom",
    //   status: "unloaded"
    // },
    {
      name: "Learnk8s",
      url: "https://rssproxy.migor.org/api/tf?url=https%3A%2F%2Flearnk8s.io%2Frss.xml&re=none&out=atom",
      status: "unloaded"
    },
    {
      name: "Stories by Daniele Polencic on Medium",
      url: "https://rssproxy.migor.org/api/tf?url=https%3A%2F%2Fmedium.com%2Ffeed%2F%40danielepolencic&re=none&out=atom",
      status: "unloaded"
    },
    {
      name: "Alex Ellis Blog",
      // url: "https://blog.alexellis.io/rss/",
      url: "https://rssproxy.migor.org/api/tf?url=https%3A%2F%2Fblog.alexellis.io%2Frss%2F&re=none&out=atom",
      status: "unloaded"
    },
    {
      name: "Argo Project",
      url: "https://rssproxy.migor.org/api/tf?url=https%3A%2F%2Fblog.argoproj.io%2Ffeed&re=none&out=atom",
      status: "unloaded"
    },
    {
      name: "The Kubernetes project blog",
      // url: "https://kubernetes.io/feed.xml",
      url: "https://rssproxy.migor.org/api/tf?url=https%3A%2F%2Fkubernetes.io%2Ffeed.xml&re=none&out=atom",
      status: "unloaded"
    },
    // {
    //   name: "Daniel Stenberg @bagder",
    //   url: "https://mastodon.social/@bagder.rss",
    //   // url: "http://localhost:8080/pandoc/bagder.rss",
    //   status: "unloaded"
    // },
    //{
    //  name: "Red Hat OpenShift Container Platform Knowledge Base",
    //  // url: "https://access.redhat.com//term/Red%20Hat%20OpenShift%20Container%20Platform/feed",
    //  url: "https://rssproxy.migor.org/api/tf?url=https%3A%2F%2Faccess.redhat.com%2Fterm%2FRed%2520Hat%2520OpenShift%2520Container%2520Platform%2Ffeed&re=none&out=atom",
    //  status: "unloaded"
    //},
    {
      name: "r/OpenShift",
      url: "https://rssproxy.migor.org/api/tf?url=https%3A%2F%2Fwww.reddit.com%2Fr%2Fopenshift.rss&re=none&out=atom",
      status: "unloaded"
    },
    {
      name: "Red Hat Blog",
      url: "https://www.redhat.com/en/rss/blog",
      status: "unloaded"
    },
    {
      name: "Red Hat Blog OpenShift",
      url: "https://www.redhat.com/en/rss/blog/channel/red-hat-openshift",
      status: "unloaded"
    },
    {
      name: "Red Hat Hybrid cloud blog",
      url: "https://cloud.redhat.com/blog/rss.xml",
      status: "unloaded"
    },
    {
      name: "Red Hat Issue Tracker - OpenShift",
      // url: "https://issues.redhat.com/sr/jira.issueviews:searchrequest-xml/temp/SearchRequest.xml?jqlQuery=project+%3D+OCPSTRAT+AND+issuetype+in+(Bug%2C+Feature)+ORDER+BY+created+DESC&tempMax=10",
      url: "https://rssproxy.migor.org/api/tf?url=https%3A%2F%2Fissues.redhat.com%2Fsr%2Fjira.issueviews%3Asearchrequest-xml%2Ftemp%2FSearchRequest.xml%3FjqlQuery%3Dproject%2B%253D%2BOCPSTRAT%2BAND%2Bissuetype%2Bin%2B(Bug%252C%2BFeature)%2BORDER%2BBY%2Bcreated%2BDESC%26tempMax%3D10&re=none&out=atom",
      status: "unloaded"
    },
    {
      name: "Red Hat Enable Sysadmin",
      // url: "https://www.redhat.com/sysadmin/rss.xml",
      url: "https://rssproxy.migor.org/api/tf?url=https%3A%2F%2Fwww.redhat.com%2Fsysadmin%2Frss.xml&re=none&out=atom",
      status: "unloaded"
    },
    {
      name: "Ansible Blog",
      url: "https://www.ansible.com/blog/rss.xml",
      status: "unloaded"
    },
    {
      name: "Cloud Native Computing Foundation",
      url: "https://rssproxy.migor.org/api/tf?url=https%3A%2F%2Fwww.cncf.io%2Ffeed%2F&re=none&out=atom",
      status: "unloaded"
    },
    {
      name: "NIST Blog Cybersecurity Insights",
      url: "https://rssproxy.migor.org/api/tf?url=https%3A%2F%2Fwww.nist.gov%2Fblogs%2Fcybersecurity-insights%2Frss.xml&re=none&out=atom",
      // url: "https://www.nist.gov/blogs/cybersecurity-insights/rss.xml",
      status: "unloaded"
    },
    //{
    //  name: "SustainOSS podcast",
    //  // url: "https://podcast.sustainoss.org/rss",
    //  // url: "https://feeds.fireside.fm/sustain/rss",
    //  url: "https://rssproxy.migor.org/api/tf?url=https%3A%2F%2Ffeeds.fireside.fm%2Fsustain%2Frss&re=none&out=atom",
    //  status: "unloaded"
    //},
    // {
    //   name: "Hackaday",
    //   url: "https://rssproxy.migor.org/api/tf?url=https%3A%2F%2Fhackaday.com%2Fblog%2Ffeed%2F&re=none&out=atom",
    //   status: "unloaded"
    // }
    {
      name: "web.dev Google Developers",
      // url: "https://web.dev/feed.xml",
      url: "https://rssproxy.migor.org/api/tf?url=https%3A%2F%2Fweb.dev%2Ffeed.xml&re=none&out=atom",
      status: "unloaded"
    },
    // {
    //   name: "LogRocket Blog",
    //   // url: "https://blog.logrocket.com/feed/",
    //   url: "https://rssproxy.migor.org/api/tf?url=https%3A%2F%2Fblog.logrocket.com%2Ffeed%2F&re=none&out=atom",
    //   status: "unloaded"
    // }
    // { // the kubernetes-security-announce group for security and vulnerability announcements
    //   url: "https://groups.google.com/forum/feed/kubernetes-security-announce/msgs/rss_v2_0.xml?num=50",
    // },
    // { // the kubernetes-security-announce group for security and vulnerability announcements
    //   url: "https://www.us-cert.gov/ncas/bulletins.xml",
    // },

  ],
  // items: [],
  // select() {
  //   let that = this;
  //   setTimeout(()=> {
  //     that.reload();
  //   }, 0);
  // },
  expandFeed(feed) {
    if (feed.status === "unloaded") {
      fetchFeed(feed);
    }
  },
  mounted() {
    // console.debug("mounted");
    // let that = this;
    // this.feeds.forEach((feed) => {
    //   fetchFeed(feed.url).then((f) => Object.assign(feed, f));
    // });
  }
}).mount("#rss-app");
