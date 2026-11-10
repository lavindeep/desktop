/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["zen.urlbar.replace-newtab", false]],
  });

  registerCleanupFunction(async () => {
    await SpecialPowers.popPrefEnv();
  });
});

add_task(async function test_Check_Creation() {
  const placeToDoubleClick =
    gZenWorkspaces.activeWorkspaceElement.querySelector(
      ".zen-workspace-empty-space"
    );
  ok(placeToDoubleClick, "We should have found the place to double click.");
  EventUtils.sendMouseEvent({ type: "dblclick" }, placeToDoubleClick, window);
  await TestUtils.waitForCondition(
    () => gBrowser.tabs.length === 3,
    "New tab should be opened."
  );
  ok(true, "New tab should be opened.");
  await BrowserTestUtils.removeTab(gBrowser.tabs[1]);
  Assert.strictEqual(gBrowser.tabs.length, 2, "There should be one tab.");
});

add_task(async function test_Creation_When_Overflowing() {
  // Turn the pref off and on so the expanded layout is applied whatever
  // state the window started in.
  await SpecialPowers.pushPrefEnv({
    set: [["zen.view.sidebar-expanded", false]],
  });
  await SpecialPowers.pushPrefEnv({
    set: [["zen.view.sidebar-expanded", true]],
  });
  await TestUtils.waitForCondition(
    () => document.documentElement.hasAttribute("zen-sidebar-expanded"),
    "The sidebar should be expanded."
  );

  const space = gZenWorkspaces.activeWorkspaceElement;
  const scrollbox = space.scrollbox;
  scrollbox.smoothScroll = false;
  const openedTabs = [];
  registerCleanupFunction(() => {
    for (const tab of openedTabs) {
      BrowserTestUtils.removeTab(tab);
    }
  });
  while (!scrollbox.overflowing) {
    openedTabs.push(
      await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:blank", true)
    );
  }
  const viewport = scrollbox.scrollClientRect;
  const tabsSection = space.querySelector(".zen-workspace-normal-tabs-section");
  let tabsBottom;
  // Opening a tab scrolls the list, so scroll to the end until it settles.
  await TestUtils.waitForCondition(() => {
    scrollbox.scrollbox.scrollTop = scrollbox.scrollbox.scrollTopMax;
    tabsBottom = tabsSection.getBoundingClientRect().bottom;
    return viewport.bottom - tabsBottom > 10;
  }, "There should be empty space below the last tab.");

  const tabCount = gBrowser.tabs.length;
  const x = viewport.left + viewport.width / 2;
  const y = (tabsBottom + viewport.bottom) / 2;
  EventUtils.synthesizeMouseAtPoint(x, y, { clickCount: 1 });
  EventUtils.synthesizeMouseAtPoint(x, y, { clickCount: 2 });
  await TestUtils.waitForCondition(
    () => gBrowser.tabs.length === tabCount + 1,
    "New tab should be opened."
  );
  openedTabs.push(gBrowser.selectedTab);
});
