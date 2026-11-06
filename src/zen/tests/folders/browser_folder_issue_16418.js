/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// A pinned tab inside a subfolder can be added to Essentials from its
// context menu, and leaves both folders intact.
add_task(async function test_Issue_16418() {
  const tab = await addTabTo(gBrowser, "data:text/html,essential");
  const parentTab = await addTabTo(gBrowser, "data:text/html,parent");
  const subfolder = await gZenFolders.createFolder([tab], {
    renameFolder: false,
    label: "subfolder",
  });
  const parent = await gZenFolders.createFolder([parentTab], {
    renameFolder: false,
    label: "parent",
  });
  parentTab.after(subfolder);
  Assert.equal(subfolder.group, parent, "Subfolder sits inside the parent");
  Assert.equal(tab.group, subfolder, "Tab sits inside the subfolder");

  const menu = document.getElementById("tabContextMenu");
  await TestUtils.waitForCondition(() => {
    const rect = tab.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2
    );
    return hit?.closest("tab") === tab;
  }, "Folder animations should settle so the tab is under the pointer");
  const shown = BrowserTestUtils.waitForEvent(menu, "popupshown");
  EventUtils.synthesizeMouseAtCenter(tab, { type: "contextmenu" });
  await shown;

  const addEssential = document.getElementById("context_zen-add-essential");
  ok(!addEssential.hidden, "Add to Essentials is shown for a foldered tab");
  ok(!addEssential.disabled, "Add to Essentials is enabled");

  const hidden = BrowserTestUtils.waitForEvent(menu, "popuphidden");
  menu.activateItem(addEssential);
  await hidden;

  ok(tab.hasAttribute("zen-essential"), "Tab became an essential");
  ok(
    tab.parentNode.classList.contains("zen-essentials-container"),
    "Tab moved into the essentials container"
  );
  ok(!tab.group, "Tab is no longer in a folder");
  ok(subfolder.isConnected, "Subfolder still exists");
  ok(!subfolder.tabs.includes(tab), "Subfolder no longer lists the tab");
  Assert.equal(subfolder.group, parent, "Subfolder stays inside the parent");
  Assert.equal(parentTab.group, parent, "Parent folder keeps its own tab");

  BrowserTestUtils.removeTab(tab);
  await removeFolder(subfolder);
  await removeFolder(parent);
});
